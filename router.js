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

//--------------------------------------------

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
