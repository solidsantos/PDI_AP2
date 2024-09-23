# Aplicação de Compressão e Descompressão de Imagens (PDI - AP2)

## Descrição
Esta aplicação permite a compressão e descompressão de imagens BMP utilizando os algoritmos LZW e Huffman. O processo de compressão reduz o tamanho dos arquivos de imagem, enquanto a descompressão recupera a imagem original a partir dos dados comprimidos.

## Tecnologias Utilizadas
- **Node.js**: Ambiente de execução JavaScript no servidor.
- **Express**: Framework para construção de aplicações web em Node.js.
- **Multer**: Middleware para manipulação de uploads de arquivos.
- **fs**: Módulo nativo do Node.js para manipulação de arquivos.

## Como Executar a Aplicação

1. **Instalação das Dependências**
   Para instalar as dependências necessárias, execute:
   ```bash
   npm install
2. **Iniciar a Aplicação**
   Para iniciar a aplicação, use o comando:
   ```bash
   npm start
3. **Acessar a Aplicação**
    Abra seu navegador e acesse:
   ```bash
   http://localhost:8080
## Como Usar

### Compressão

- Para compressão, utilize a imagem disponibilizada no link: [benchmark.bmp](http://www.lia.ufc.br/~yuri/20192/pdi/benchmark.bmp).
- Após a compressão, um arquivo .pdi será salvo em `/uploads/compressed`. Esse arquivo pode ser utilizado para descompressão.

### Descompressão

- A descompressão gerará uma imagem .bmp que será salva em `/uploads/decompressed`.
