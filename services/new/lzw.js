import fs from 'fs';

// Função para aplicar LZW em um array de bytes
function applyLZW(input) {
    const dictionary = new Map();
    let currentWord = '';
    const result = [];
    let dictSize = 256;

    // Preencher o dicionário inicial com todos os caracteres possíveis (0-255)
    for (let i = 0; i < 256; i++) {
        dictionary.set(String.fromCharCode(i), i);
    }

    for (const char of input) {
        const combinedWord = currentWord + String.fromCharCode(char);

        if (dictionary.has(combinedWord)) {
            currentWord = combinedWord;
        } else {
            result.push(dictionary.get(currentWord));
            if (dictSize < 65536) {
                dictionary.set(combinedWord, dictSize++);
            }
            currentWord = String.fromCharCode(char);
        }
    }

    // Adicionar o último símbolo no resultado
    if (currentWord !== '') {
        result.push(dictionary.get(currentWord));
    }

    return result;
}

// Função para criar um cabeçalho LZW com dimensões da imagem
function createLZWHeader(width, height) {
    const headerSize = 8;
    const header = Buffer.alloc(headerSize);
    header.writeUInt32LE(width, 0);
    header.writeUInt32LE(height, 4);
    return header;
}

// Função para salvar o arquivo comprimido no formato LZW
function saveCompressedFileLZW(compressedData, width, height, outputFilePath) {
    const header = createLZWHeader(width, height);
    const compressedBuffer = Buffer.alloc(compressedData.length * 2);
    for (let i = 0; i < compressedData.length; i++) {
        compressedBuffer.writeUInt16LE(compressedData[i], i * 2);
    }
    const finalBuffer = Buffer.concat([header, compressedBuffer]);
    //console.log('Final Buffer Size:', finalBuffer.length);
    fs.writeFileSync(outputFilePath, finalBuffer);
}

// Função para ler os dados de pixel (mantendo o formato BGR)
function readPixelData(bmpData) {
    const width = bmpData.readUInt32LE(18);
    const height = bmpData.readUInt32LE(22);
    const bitsPerPixel = 24;
    const bytesPerPixel = bitsPerPixel / 8;
    const rowSize = Math.ceil((width * bytesPerPixel) / 4) * 4;
    const pixelData = Buffer.alloc(width * height * bytesPerPixel);
    const pixelDataOffset = bmpData.readUInt32LE(10);
    let srcOffset = pixelDataOffset;
    let dstOffset = 0;

    for (let y = height - 1; y >= 0; y--) {
        bmpData.copy(pixelData, dstOffset, srcOffset, srcOffset + width * bytesPerPixel);
        srcOffset += rowSize;
        dstOffset += width * bytesPerPixel;
    }

    return pixelData;
}

// Função para comprimir uma imagem BMP
export function compressImage(inputFilePath, outputFilePath) {
    return new Promise((resolve, reject) => {
        try {
            const bmpData = fs.readFileSync(inputFilePath);
            const pixelData = readPixelData(bmpData);
            const compressedData = applyLZW(pixelData);
            const width = bmpData.readUInt32LE(18);
            const height = bmpData.readUInt32LE(22);
            saveCompressedFileLZW(compressedData, width, height, outputFilePath);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

// Função para descomprimir dados LZW
function decompressLZW(compressedData, width, height) {
    const dictionary = new Map();
    let dictSize = 256;
    const result = [];

    for (let i = 0; i < 256; i++) {
        dictionary.set(i, String.fromCharCode(i));
    }

    let currentCode = compressedData[0];
    let currentString = dictionary.get(currentCode);
    result.push(currentString);

    for (let i = 1; i < compressedData.length; i++) {
        const code = compressedData[i];
        let entry = '';

        if (dictionary.has(code)) {
            entry = dictionary.get(code);
        } else if (code === dictSize) {
            entry = currentString + currentString[0];
        } else {
            throw new Error(`Invalid LZW code: ${code}`);
        }

        result.push(entry);
        if (dictSize < 65536) {
            dictionary.set(dictSize++, currentString + entry[0]);
        }
        currentString = entry;
    }

    const pixelData = Buffer.alloc(width * height * 3);
    let dstOffset = 0;

    for (const entry of result) {
        for (const char of entry) {
            pixelData[dstOffset++] = char.charCodeAt(0);
        }
    }

    const rowSize = Math.ceil((width * 3) / 4) * 4;
    const paddedPixelData = Buffer.alloc(rowSize * height);

    for (let y = 0; y < height; y++) {
        pixelData.copy(paddedPixelData, y * rowSize, y * width * 3, Math.min(pixelData.length, (y + 1) * width * 3));
    }

    return paddedPixelData;
}

// Função para ler o cabeçalho de um arquivo LZW
function readLZWHeader(filePath) {
    const headerSize = 8;
    const header = fs.readFileSync(filePath, { start: 0, end: headerSize - 1 });
    const width = header.readUInt32LE(0);
    const height = header.readUInt32LE(4);

    if (width <= 0 || width > 10000) {
        throw new Error('Invalid width in header');
    }
    if (height <= 0 || height > 10000) {
        throw new Error('Invalid height in header');
    }

    return { width, height };
}

// Função para descomprimir uma imagem LZW
export function decompressImage(inputFilePath, outputFilePath) {
    return new Promise((resolve, reject) => {
        try {
            const compressedData = fs.readFileSync(inputFilePath);
            const { width, height } = readLZWHeader(inputFilePath);
            const compressedArray = [];
            for (let i = 8; i < compressedData.length; i += 2) {
                compressedArray.push(compressedData.readUInt16LE(i));
            }
            let pixelData = decompressLZW(compressedArray, width, height);
            const bmpHeader = Buffer.alloc(54);
            bmpHeader.writeUInt32LE(0x4D42, 0);
            bmpHeader.writeUInt32LE(54 + pixelData.length, 2);
            bmpHeader.writeUInt32LE(54, 10);
            bmpHeader.writeUInt32LE(40, 14);
            bmpHeader.writeUInt32LE(width, 18);
            bmpHeader.writeUInt32LE(height, 22);
            bmpHeader.writeUInt16LE(1, 26);
            bmpHeader.writeUInt16LE(24, 28);
            bmpHeader.writeUInt32LE(0, 30);
            bmpHeader.writeUInt32LE(pixelData.length, 34);
            bmpHeader.writeUInt32LE(2835, 38);
            bmpHeader.writeUInt32LE(2835, 42);
            bmpHeader.writeUInt32LE(0, 46);
            bmpHeader.writeUInt32LE(0, 50);
            const bmpImage = Buffer.concat([bmpHeader, pixelData]);
            fs.writeFileSync(outputFilePath, bmpImage);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

// Função principal para compressão e descompressão
(async () => {
    const inputBMPFile = '../uploads/benchmark.bmp';
    const outputPDIFile = '../uploads/compressed/benchmark.lzw';
    const outputPDINewFile = '../uploads/decompressed/benchmark_decompressed.lzw';
    const outputBMPFile = '../uploads/decompressed/benchmark_decompressed.bmp';

    try {
        await compressImage(inputBMPFile, outputPDIFile);
        console.log("Compressão concluída.");
        
        await decompressImage(outputPDINewFile, outputBMPFile);
        console.log("Descompressão concluída.");
    } catch (error) {
        console.error("Erro:", error);
    }
})();
