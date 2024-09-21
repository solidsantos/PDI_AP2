import fs from 'fs';

class Node {
    constructor(char, freq) {
        this.char = char;
        this.freq = freq;
        this.left = null;
        this.right = null;
    }
}

// Função para construir a árvore de Huffman
function buildHuffmanTree(frequencies) {
    const nodes = Object.entries(frequencies).map(([char, freq]) => new Node(char, freq));

    while (nodes.length > 1) {
        nodes.sort((a, b) => a.freq - b.freq);
        const left = nodes.shift();
        const right = nodes.shift();
        const merged = new Node(null, left.freq + right.freq);
        merged.left = left;
        merged.right = right;
        nodes.push(merged);
    }

    return nodes[0];
}

// Função para construir os códigos de Huffman
function buildHuffmanCodes(node, prefix = '', codeMap = {}) {
    if (node.left === null && node.right === null) {
        codeMap[node.char] = prefix;
    } else {
        if (node.left) buildHuffmanCodes(node.left, prefix + '0', codeMap);
        if (node.right) buildHuffmanCodes(node.right, prefix + '1', codeMap);
    }
    return codeMap;
}

// Função para comprimir dados usando Huffman
export function huffmanCompress(data) {
    const frequencies = {};
    for (const byte of data) {
        frequencies[byte] = (frequencies[byte] || 0) + 1;
    }

    const huffmanTree = buildHuffmanTree(frequencies);
    const huffmanCodes = buildHuffmanCodes(huffmanTree);

    const compressedBits = data.map(byte => huffmanCodes[byte]).join('');
    return { compressedBits, huffmanCodes };
}

// Função para converter uma string binária em um Buffer
function binaryStringToBuffer(binaryString) {
    const buffer = Buffer.alloc(Math.ceil(binaryString.length / 8));
    for (let i = 0; i < binaryString.length; i++) {
        if (binaryString[i] === '1') {
            buffer[Math.floor(i / 8)] |= (1 << (7 - (i % 8)));
        }
    }
    return buffer;
}

// Função para descomprimir dados usando Huffman
export function huffmanDecompress(compressedData, huffmanCodes) {
    const reversedCodes = Object.fromEntries(Object.entries(huffmanCodes).map(([k, v]) => [v, k]));
    const result = [];
    let currentCode = '';

    for (const bit of compressedData) {
        currentCode += bit;
        if (reversedCodes[currentCode]) {
            result.push(Number(reversedCodes[currentCode]));
            currentCode = '';
        }
    }

    return Buffer.from(result); // Retorna um Buffer com os bytes dos pixels
}

// Função para salvar os dados comprimidos e os códigos de Huffman em um arquivo
function saveCompressedFile(compressedBits, huffmanCodes, outputFilePath, width, height) {
    const codesBuffer = Buffer.from(JSON.stringify(huffmanCodes));
    const compressedBuffer = binaryStringToBuffer(compressedBits);
    const headerBuffer = Buffer.alloc(4);
    headerBuffer.writeUInt32LE(codesBuffer.length, 0);

    // Salvar largura e altura
    const sizeBuffer = Buffer.alloc(8);
    sizeBuffer.writeUInt32LE(width, 0);
    sizeBuffer.writeUInt32LE(height, 4);

    fs.writeFileSync(outputFilePath, Buffer.concat([headerBuffer, codesBuffer, sizeBuffer, compressedBuffer]));
}

// Função para ler os dados de pixel de um arquivo BMP
function readBMPFile(inputFilePath) {
    const bmpData = fs.readFileSync(inputFilePath);
    const pixelDataOffset = bmpData.readUInt32LE(10);
    const width = bmpData.readUInt32LE(18);
    const height = bmpData.readUInt32LE(22);
    const pixels = bmpData.slice(pixelDataOffset);

    return {
        width,
        height,
        pixels: Array.from(pixels) // Converte Buffer para array de bytes
    };
}

// Função para ler o arquivo comprimido
export function readCompressedFile(inputFilePath) {
    const compressedData = fs.readFileSync(inputFilePath);
    const codesSize = compressedData.readUInt32LE(0);
    const codesBuffer = compressedData.slice(4, 4 + codesSize);
    const huffmanCodes = JSON.parse(codesBuffer.toString());

    const width = compressedData.readUInt32LE(4 + codesSize);
    const height = compressedData.readUInt32LE(8 + codesSize);
    const compressedBuffer = compressedData.slice(8 + codesSize);

    // Converte o buffer para uma string binária
    let compressedBits = '';
    for (const byte of compressedBuffer) {
        compressedBits += byte.toString(2).padStart(8, '0'); // Adiciona zeros à esquerda
    }

    return { huffmanCodes, compressedBits, width, height };
}

// Função para salvar dados de volta em formato BMP
function saveBMPFile(outputFilePath, width, height, pixelData) {
    const header = Buffer.alloc(54);
    header.writeUInt32LE(0x4D42, 0); // 'BM'
    header.writeUInt32LE(54 + pixelData.length, 2); // Tamanho do arquivo
    header.writeUInt32LE(54, 10); // Offset dos dados da imagem
    header.writeUInt32LE(40, 14); // Tamanho do cabeçalho de informação
    header.writeUInt32LE(width, 18); // Largura
    header.writeUInt32LE(height, 22); // Altura
    header.writeUInt16LE(1, 26); // Planos de cor
    header.writeUInt16LE(24, 28); // Profundidade de cor
    header.writeUInt32LE(0, 30); // Compressão
    header.writeUInt32LE(pixelData.length, 34); // Tamanho dos dados da imagem
    header.writeUInt32LE(2835, 38); // Resolução horizontal
    header.writeUInt32LE(2835, 42); // Resolução vertical
    header.writeUInt32LE(0, 46); // Número de cores na paleta
    header.writeUInt32LE(0, 50); // Número de cores importantes

    fs.writeFileSync(outputFilePath, Buffer.concat([header, pixelData]));
}

// Função para compressão da imagem
function compressImage(inputFilePath, compressedFilePath) {
    const { width, height, pixels } = readBMPFile(inputFilePath);
    const { compressedBits, huffmanCodes } = huffmanCompress(pixels);
    saveCompressedFile(compressedBits, huffmanCodes, compressedFilePath, width, height);
    console.log('Image compressed and saved to', compressedFilePath);
}

// Função para descompressão da imagem
function decompressImage(compressedFilePath, outputFilePath) {
    const { huffmanCodes, compressedBits, width, height } = readCompressedFile(compressedFilePath);
    const decompressedData = huffmanDecompress(compressedBits, huffmanCodes);
    saveBMPFile(outputFilePath, width, height, decompressedData);
    console.log('Image decompressed and saved to', outputFilePath);
}

// Exemplo de uso
const inputBMPFile = '../uploads/benchmark.bmp'; // Caminho do arquivo BMP de entrada
const compressedHuffFile = '../uploads/benchmark.huff'; // Caminho do arquivo de saída comprimido
const outputBMPFile = '../uploads/benchmark_decompressed.bmp'; // Caminho do arquivo BMP descomprimido

// Chamada para compressão
//compressImage(inputBMPFile, compressedHuffFile);

// Chamada para descompressão
//decompressImage(compressedHuffFile, outputBMPFile);
