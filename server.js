import express from 'express';
import router from './router.js';
// import routes from './routes.js';

const server = express();
const PORT = 8080;


server.use('/', router);
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});