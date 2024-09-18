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

// Função para salvar o arquivo comprimido no formato LZW
function saveCompressedFileLZW(compressedData, width, height, outputFilePath) {
    const header = createLZWHeader(width, height);

    // Converter os dados comprimidos para um buffer de 16 bits
    const compressedBuffer = Buffer.alloc(compressedData.length * 2);
    for (let i = 0; i < compressedData.length; i++) {
        if (compressedData[i] > 65535) {
            throw new Error(`LZW code exceeds 16-bit range: ${compressedData[i]}`);
        }
        compressedBuffer.writeUInt16LE(compressedData[i], i * 2);
    }

    // Combine o cabeçalho e os dados comprimidos
    const finalBuffer = Buffer.concat([header, compressedBuffer]);

    // Salvar o buffer no arquivo
    fs.writeFileSync(outputFilePath, finalBuffer);
}

// Função para criar um cabeçalho LZW com dimensões da imagem
function createLZWHeader(width, height) {
    const headerSize = 8;
    const header = Buffer.alloc(headerSize);

    // Escrever a largura e a altura na forma de 4 bytes cada
    header.writeUInt32LE(width, 0);
    header.writeUInt32LE(height, 4);

    return header;
}

// Função para ler os dados de pixel (mantendo o formato BGR)
function readPixelData(bmpData) {
    const width = bmpData.readUInt32LE(18);
    const height = bmpData.readUInt32LE(22);
    const rowSize = Math.ceil((width * 3) / 4) * 4; // Alinhamento dos bytes em múltiplos de 4
    const pixelData = Buffer.alloc(width * height * 3); // Alocar o buffer correto sem o padding

    for (let y = 0; y < height; y++) {
        bmpData.copy(pixelData, y * width * 3, 54 + y * rowSize, 54 + y * rowSize + width * 3); // Copiar apenas os dados de pixel
    }

    return pixelData;
}

// Função para inverter cores BGR para RGB
function invertColors(pixelData, width, height) {
    for (let i = 0; i < width * height * 3; i += 3) {
        const temp = pixelData[i]; // B
        pixelData[i] = pixelData[i + 2]; // R
        pixelData[i + 2] = temp; // Troca de R e B
    }
    return pixelData;
}

// Função para comprimir uma imagem BMP
export function compressImage(inputFilePath, outputFilePath) {
    const bmpData = fs.readFileSync(inputFilePath);
    const pixelData = readPixelData(bmpData); // Ler os dados de pixel no formato BGR

    // Aplique a compressão LZW
    const compressedData = applyLZW(pixelData);

    // Extrair largura e altura da imagem BMP
    const width = bmpData.readUInt32LE(18);
    const height = bmpData.readUInt32LE(22);

    // Salve o arquivo comprimido
    saveCompressedFileLZW(compressedData, width, height, outputFilePath);

    console.log('Image compressed successfully!');
}

// Função para descomprimir dados LZW
function decompressLZW(compressedData, width, height) {
    const dictionary = new Map();
    let dictSize = 256;
    const result = [];

    // Inicializar o dicionário com caracteres únicos
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

        // Adicionar nova entrada ao dicionário
        dictionary.set(dictSize++, currentString + entry[0]);
        currentString = entry;
    }

    const pixelData = Buffer.from(result.join(''), 'binary');
    const rowSize = Math.ceil((width * 3) / 4) * 4;
    const paddedPixelData = Buffer.alloc(rowSize * height, 0);

    for (let y = 0; y < height; y++) {
        pixelData.copy(paddedPixelData, y * rowSize, y * width * 3, Math.min(pixelData.length, (y + 1) * width * 3));
    }

    return paddedPixelData;
}

// Função para ler o cabeçalho de um arquivo LZW
function readLZWHeader(filePath) {
    const headerSize = 8;
    const header = fs.readFileSync(filePath, { start: 0, end: headerSize });
    const width = header.readUInt32LE(0);
    const height = header.readUInt32LE(4);
    return { width, height };
}

// Função para descomprimir uma imagem LZW
export function decompressImage(inputFilePath, outputFilePath) {
    // Leia o arquivo comprimido
    const compressedData = fs.readFileSync(inputFilePath);

    // Extrair o cabeçalho (largura e altura) do arquivo comprimido
    const { width, height } = readLZWHeader(inputFilePath);

    // Dados comprimidos
    const compressedArray = [];
    for (let i = 8; i < compressedData.length; i += 2) {
        compressedArray.push(compressedData.readUInt16LE(i));
    }

    // Aplique a descompressão LZW
    let pixelData = decompressLZW(compressedArray, width, height);

    // Inverter as cores de BGR para RGB, se necessário
    pixelData = invertColors(pixelData, width, height);

    // Adicionar o cabeçalho BMP de volta à imagem
    const bmpHeader = Buffer.alloc(54); // Cabeçalho BMP completo
    bmpHeader.writeUInt32LE(0x4D42, 0); // 'BM' header
    bmpHeader.writeUInt32LE(54 + pixelData.length, 2); // Tamanho do arquivo
    bmpHeader.writeUInt32LE(54, 10); // Offset dos dados da imagem
    bmpHeader.writeUInt32LE(40, 14); // Tamanho do cabeçalho de informação
    bmpHeader.writeUInt32LE(width, 18); // Largura
    bmpHeader.writeUInt32LE(height, 22); // Altura
    bmpHeader.writeUInt16LE(1, 26); // Planos de cor
    bmpHeader.writeUInt16LE(24, 28); // Profundidade de cor
    bmpHeader.writeUInt32LE(0, 30); // Compressão
    bmpHeader.writeUInt32LE(pixelData.length, 34); // Tamanho dos dados da imagem
    bmpHeader.writeUInt32LE(2835, 38); // Resolução horizontal
    bmpHeader.writeUInt32LE(2835, 42); // Resolução vertical
    bmpHeader.writeUInt32LE(0, 46); // Número de cores na paleta
    bmpHeader.writeUInt32LE(0, 50); // Número de cores importantes

    // Salve a imagem descomprimida
    const bmpImage = Buffer.concat([bmpHeader, pixelData]);
    fs.writeFileSync(outputFilePath, bmpImage);

    console.log('Image decompressed successfully!');
}

// Testar a compressão e descompressão

compressImage('./uploads/benchmark.bmp', './uploads/benchmark.lzw');
decompressImage('./uploads/benchmark.lzw', './uploads/benchmark_02.bmp');
