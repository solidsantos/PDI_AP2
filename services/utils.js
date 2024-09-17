import multer from 'multer';
// Função para formatar o tamanho do arquivo
export const formatSize = (size) => {
    if (size >= 1048576) { // Maior ou igual a 1 MB
        return (size / 1048576).toFixed(2) + ' MB';
    } else if (size >= 1024) { // Maior ou igual a 1 KB
        return (size / 1024).toFixed(2) + ' KB';
    } else {
        return size + ' Bytes';
    }
};

// Configuração do multer para armazenar as imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/bmp') {
        cb(null, true);
    } else {
        cb(new Error('Only .bmp files are allowed'), false);
    }
}

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

