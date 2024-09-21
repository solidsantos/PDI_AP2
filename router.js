import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { upload, formatSize } from './services/utils.js';
import { compressImage, decompressImage } from './services/lzw.js';
import { error } from 'console';

const router = express.Router();

// Rota POST para upload de imagens
router.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('File not sent.');
    }
    res.status(201).json({message: 'Upload successfully!'});
});

router.post('/compresslzw', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputFilePath = path.join('uploads', req.file.originalname);
    const outputFilePath = path.join('uploads', 'compressed', req.file.originalname.replace(".bmp", "") + '.lzw');

    compressImage(inputFilePath, outputFilePath)
        .then(() => {
            res.status(201).json({ message: 'File compressed successfully!', file: outputFilePath });
            // Note: Se você quiser que o cliente faça o download do arquivo imediatamente após o upload,
            // você pode usar res.download() em vez de res.status(201).json(), mas não ambos ao mesmo tempo.
        })
        .catch((err) => {
            res.status(500).json({ error: 'Failed to compress image', details: err.message });
        });
});

router.post('/decompresslzw', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verifique se o arquivo é um arquivo .lzw
    if (!req.file.originalname.endsWith('.lzw')) {
        return res.status(400).json({ error: 'Invalid file type. Expected a .lzw file.' });
    }

    const inputFilePath = path.join('uploads', req.file.originalname);
    const outputFilePath = path.join('uploads', 'decompressed', req.file.originalname.replace('.lzw', '.bmp'));

    decompressImage(inputFilePath, outputFilePath)
        .then(() => {
            res.status(201).json({ message: 'File decompressed successfully!', file: outputFilePath });
            // Optionally, you might want to remove the uploaded file if no longer needed
            fs.unlinkSync(inputFilePath);
        })
        .catch((err) => {
            res.status(500).json({ error: 'Failed to decompress image', details: err.message });
        });
});


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
});
export default router;
