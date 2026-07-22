window.onload = function() {
    const loadingScreen = document.getElementById('loadingScreen');
    const progressBar = document.querySelector('.progress-bar');
    let progress = 0;

    const interval = setInterval(function() {
        progress += 10; // Incrementar el progreso
        progressBar.style.width = progress + '%'; // Actualizar el ancho de la barra

        if (progress >= 100) {
            clearInterval(interval); // Detener el intervalo cuando se llega al 100%
            loadingScreen.style.display = 'none'; // Ocultar pantalla de carga
        }
    }, 160); // Actualizar cada 500 ms
};
