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
    if (!node) return;
    if (node.left === null && node.right === null) {
        codeMap[node.char] = prefix;
    } else {
        buildHuffmanCodes(node.left, prefix + '0', codeMap);
        buildHuffmanCodes(node.right, prefix + '1', codeMap);
    }
    return codeMap;
}

// Função para comprimir dados usando Huffman
export function huffmanCompress(data) {
    if (data.length === 0) return { compressedBits: '', huffmanCodes: {} };

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

    return Buffer.from(result);
}

// Função para salvar os dados comprimidos e os códigos de Huffman em um arquivo
function saveCompressedFile(compressedBits, huffmanCodes, outputFilePath) {
    const codesBuffer = Buffer.from(JSON.stringify(huffmanCodes));
    const compressedBuffer = binaryStringToBuffer(compressedBits);
    const headerBuffer = Buffer.alloc(4);
    headerBuffer.writeUInt32LE(codesBuffer.length, 0);

    fs.writeFileSync(outputFilePath, Buffer.concat([headerBuffer, codesBuffer, compressedBuffer]));
}

// Função para ler o arquivo .lzw
function readLZWFile(inputFilePath) {
    return fs.readFileSync(inputFilePath);
}

// Função para ler o arquivo comprimido
export function readCompressedFile(inputFilePath) {
    const compressedData = fs.readFileSync(inputFilePath);
    const codesSize = compressedData.readUInt32LE(0);
    const codesBuffer = compressedData.slice(4, 4 + codesSize);
    const huffmanCodes = JSON.parse(codesBuffer.toString());
    const compressedBuffer = compressedData.slice(4 + codesSize);

    let compressedBits = '';
    for (const byte of compressedBuffer) {
        compressedBits += byte.toString(2).padStart(8, '0');
    }

    return { huffmanCodes, compressedBits };
}

// Função para compressão do arquivo .lzw
function compressLZWFile(inputFilePath, compressedFilePath) {
    const pixels = readLZWFile(inputFilePath);
    const { compressedBits, huffmanCodes } = huffmanCompress(Array.from(pixels));
    saveCompressedFile(compressedBits, huffmanCodes, compressedFilePath);
    console.log('File compressed and saved to', compressedFilePath);
}

// Função para descompressão do arquivo comprimido
function decompressLZWFile(compressedFilePath, outputFilePath) {
    const { huffmanCodes, compressedBits } = readCompressedFile(compressedFilePath);
    const decompressedData = huffmanDecompress(compressedBits, huffmanCodes);
    fs.writeFileSync(outputFilePath, decompressedData);
    console.log('File decompressed and saved to', outputFilePath);
}

// Exemplo de uso
const inputLZWFile = '../uploads/compressed/benchmark.lzw'; // Caminho do arquivo .lzw de entrada
const compressedHuffFile = '../uploads/compressed/benchmark.pdi'; // Caminho do arquivo de saída comprimido
const outputLZWFile = '../uploads/decompressed/benchmark_decompressed.lzw'; // Caminho do arquivo .lzw descomprimido

// Chamada para compressão
//compressLZWFile(inputLZWFile, compressedHuffFile);

// Chamada para descompressão
//decompressLZWFile(compressedHuffFile, outputLZWFile);
