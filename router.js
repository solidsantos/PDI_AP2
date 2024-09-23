import express from 'express';
import multer from 'multer';
import { upload } from './services/utils.js';
import imageController from './controllers/imageController.js';

const router = express.Router();

router.get('/', imageController.renderHome);

// Rota POST para upload de imagens
router.post('/upload', imageController.uploadImage);

// Rota GET para listar as imagens no diretório /uploads
router.get('/images', imageController.listImages);

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

export default router;
