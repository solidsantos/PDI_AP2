import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { upload, formatSize } from './services/utils.js';
import imageController from './controllers/imageController.js';

const router = express.Router();

router.get('/', imageController.renderHome);

// Rota POST para upload de imagens
router.post('/upload', imageController.uploadImage);

// Rota POST para compressão de imagens
router.post('/compress', upload.single('image'), imageController.compress);

//Rota POST para descompressão de imagens
router.post('/decompress', upload.single('image'), imageController.decompress);

/*
router.post('/compress', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputBMPFile = path.join('uploads', req.file.originalname);
    const outputLZWFile = path.join('uploads', 'compressed', req.file.originalname.replace('.bmp', '') + '.lzw');
    const outputPDIFile = path.join('uploads', 'compressed', req.file.originalname.replace('.bmp', '') + '.pdi');

    (async () => {
        try {
            // Compressão LZW
            await compressImage(inputBMPFile, outputLZWFile);

            // Compressão Huffman
            const huff = await import('./services/huff.js');
            await huff.compressLZWFile(outputLZWFile, outputPDIFile);

            // Exclui o arquivo .lzw após gerar o .pdi
            fs.unlinkSync(outputLZWFile);
            
            res.status(201).json({ message: 'File compressed successfully!', file: outputPDIFile });
        } catch (error) {
            console.error("Erro:", error);
            res.status(500).json({ error: 'Failed to compress image', details: error.message });
        }
    })();
});

router.post('/decompress', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verifique se o arquivo é um arquivo .pdi
    if (!req.file.originalname.endsWith('.pdi')) {
        return res.status(400).json({ error: 'Invalid file type. Expected a .pdi file.' });
    }

    const inputPDIFile = path.join('uploads', req.file.originalname);
    const outputLZWFile = path.join('uploads', 'decompressed', req.file.originalname.replace('.pdi', '.lzw'));
    const outputBMPFile = path.join('uploads', 'decompressed', req.file.originalname.replace('.pdi', '.bmp'));

    (async () => {
        try {
            // Descompressão Huffman para gerar o arquivo .lzw
            const huff = await import('./services/huff.js');

            await huff.decompressLZWFile(inputPDIFile, outputLZWFile);

            fs.unlinkSync(inputPDIFile);
            
            // Descompressão LZW para gerar o arquivo .bmp
            await decompressImage(outputLZWFile, outputBMPFile);

            // Exclui o arquivo .lzw após gerar o .bmp
            fs.unlinkSync(outputLZWFile);

            res.status(201).json({ message: 'File decompressed successfully!', file: outputBMPFile });
        } catch (error) {
            console.error("Erro:", error);
            res.status(500).json({ error: 'Failed to decompress image', details: error.message });
        }
    })();
});*/

// Middleware de tratamento de erros
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Erro de multer
        return res.status(400).send(err.message);
    } else if (err) {
        // Erro de validação ou outros erros
        return res.status(400).send(err.message);
    }
    res.status(500).send('Internal Server Error.');
});

// Função auxiliar para ler diretórios recursivamente
function readDirectory(directoryPath) {
    return new Promise((resolve, reject) => {
        fs.readdir(directoryPath, (err, files) => {
            if (err) {
                return reject(err);
            }

            const results = [];
            let pending = files.length;

            if (pending === 0) {
                return resolve(results);
            }

            files.forEach(file => {
                const filePath = path.join(directoryPath, file);

                fs.stat(filePath, (err, stats) => {
                    if (err) {
                        return reject(err);
                    }

                    if (stats.isDirectory()) {
                        readDirectory(filePath)
                            .then(subResults => {
                                results.push({
                                    name: file,
                                    content: subResults
                                });

                                if (--pending === 0) {
                                    resolve(results);
                                }
                            })
                            .catch(reject);
                    } else {
                        const ext = path.extname(file).slice(1); // Remove o ponto do final

                        results.push({
                            name: file,
                            size: formatSize(stats.size),
                            format: ext
                        });

                        if (--pending === 0) {
                            resolve(results);
                        }
                    }
                });
            });
        });
    });
}

/*
// Rota GET para listar todas as imagens
router.get('/images', (req, res) => {
    const directoryPath = path.join('uploads');

    readDirectory(directoryPath)
        .then(results => res.json(results))
        .catch(err => res.status(500).send('Unable to scan directory.'));
});

router.delete('/image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join('uploads', filename);

    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(404).send('Image not found or could not delete');
        }
        res.send('Image deleted successfully!');
    });
});*/
export default router;
