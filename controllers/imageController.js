import { upload } from "../services/utils.js";
import multer from "multer";
import path from 'path';
import fs from 'fs';
import { compressImage, decompressImage } from "../services/lzw.js";

const imageController = {
    renderHome: (req, res) => {
        res.render('index', { title: 'Compressão e Descompressão de Imagens' });
    },

    uploadImage: (req, res) => {
        const uploadSingle = upload.single('image');
        uploadSingle(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).send(err.message);
            } else if (err) {
                return res.status(400).send(err.message);
            }

            if (!req.file) {
                return res.status(400).send('Nenhum arquivo enviado.');
            }

            res.status(201).json({ message: 'Upload realizado com sucesso!' });
        });
    },

    compress: async (req, res) => {
        // Verifique se o arquivo foi enviado
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const inputBMPFile = path.join('uploads', req.file.originalname);
        const outputLZWFile = path.join('uploads', 'compressed', req.file.originalname.replace('.bmp', '') + '.lzw');
        const outputPDIFile = path.join('uploads', 'compressed', req.file.originalname.replace('.bmp', '') + '.pdi');

        try {
            // Compressão LZW
            await compressImage(inputBMPFile, outputLZWFile);

            // Compressão Huffman
            const huff = await import('../services/huff.js'); // Ajuste conforme necessário
            await huff.compressLZWFile(outputLZWFile, outputPDIFile);

            // Exclui o arquivo .lzw após gerar o .pdi
            fs.unlinkSync(outputLZWFile);
            
            res.status(201).json({ message: 'Arquivo comprimido com sucesso!', file: outputPDIFile });
        } catch (error) {
            console.error("Erro:", error);
            res.status(500).json({ error: 'Falha na compressão da imagem.', details: error.message });
        }
    },

    decompress: async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        // Verifica se o arquivo é .pdi
        if (!req.file.originalname.endsWith('.pdi')) {
            return res.status(400).json({ error: 'Tipo de arquivo inválido. Esperado arquivo .pdi.' });
        }

        const inputPDIFile = path.join('uploads', req.file.originalname);
        const outputLZWFile = path.join('uploads', 'decompressed', req.file.originalname.replace('.pdi', '.lzw'));
        const outputBMPFile = path.join('uploads', 'decompressed', req.file.originalname.replace('.pdi', '.bmp'));

        try {
            // Descompressão Huffman
            const huff = await import('../services/huff.js');
            await huff.decompressLZWFile(inputPDIFile, outputLZWFile);

            // Exclui o arquivo .pdi após descompressão
            fs.unlinkSync(inputPDIFile);

            // Descompressão LZW
            await decompressImage(outputLZWFile, outputBMPFile);

            // Exclui o arquivo .lzw após gerar o .bmp
            fs.unlinkSync(outputLZWFile);

            res.status(201).json({ message: 'Arquivo descomprimido com sucesso!', file: outputBMPFile });
        } catch (error) {
            console.error("Erro:", error);
            res.status(500).json({ error: 'Falha na descompressão da imagem.', details: error.message });
        }
    }

}

export default imageController;