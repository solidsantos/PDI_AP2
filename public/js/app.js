function showMessage(message, isError = false) {
    const statusMessage = document.getElementById('statusMessage');
    const errorMessage = document.getElementById('errorMessage');
    if (isError) {
        errorMessage.textContent = message;
        statusMessage.textContent = '';
    } else {
        statusMessage.textContent = message;
        errorMessage.textContent = '';
    }
}

document.getElementById('uploadForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);  // Use e.target para referir-se ao formulário
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            window.alert(data.message);
            e.target.reset();
        })
        .catch(error => showMessage('Erro ao enviar a imagem.', true));
});

document.getElementById('compressForm').addEventListener('submit', (e) => {
    e.preventDefault(); // Impede o envio padrão do formulário

    const formData = new FormData(e.target); // Captura os dados do formulário

    fetch('/compress', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro na rede');
            }
            return response.json();
        })
        .then(data => {
            window.alert(data.message);
            e.target.reset();
        }) // Alerta com a mensagem de sucesso
        .catch(error => window.alert('Erro ao enviar a imagem: ' + error.message)); // Alerta de erro
});

document.getElementById('decompressForm').addEventListener('submit', (e) => {
    e.preventDefault(); // Impede o envio padrão do formulário

    const formData = new FormData(e.target); // Captura os dados do formulário

    fetch('/decompress', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro na rede');
            }
            return response.json();
        })
        .then(data => {
            window.alert(data.message);
            e.target.reset();
        }) // Alerta com a mensagem de sucesso
        .catch(error => window.alert('Erro ao enviar a imagem: ' + error.message)); // Alerta de erro
});



