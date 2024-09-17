import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { upload, formatSize} from './services/utils.js';

const router = express.Router();

// Rota POST para upload de imagens
router.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('File not sent.');
    }
    res.send('Upload successfully!');
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

// Rota GET para listar todas as imagens
router.get('/images', (req, res) => {
    const directoryPath = path.join('uploads');

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to scan directory.');
        }

        const images = files.map(file => {
            const filePath = path.join(directoryPath, file);
            const stats = fs.statSync(filePath);
            const ext = path.extname(file).slice(1); // Remove o ponto do final

            return {
                name: file,
                size: formatSize(stats.size),
                format: ext
            };
        });

        res.json(images);
    });
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
