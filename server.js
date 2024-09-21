import express from 'express';
import router from './router.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Criar __dirname manualmente no ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = express();
const PORT = 8080;

// Configurar o motor de visualização e o diretório de views
server.set('view engine', 'ejs');
server.set('views', path.join(__dirname, 'views'));

// Servir arquivos estáticos
server.use(express.static(path.join(__dirname, 'public')));
//server.use(express.urlencoded({ extended: true })); // Para processar dados do formulário
//server.use(express.json()); // Para processar JSON

// Usar o roteador importado
server.use('/', router);

// Iniciar o servidor
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
