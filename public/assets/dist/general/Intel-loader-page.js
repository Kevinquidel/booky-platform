document.addEventListener('DOMContentLoaded', function () {
    const loader = document.getElementById('intelligentLoader');

    function showLoader() {
        loader.style.display = 'block';
        // Configura un temporizador para ocultar el loader después de 2 segundos (2000 milisegundos)
        setTimeout(function () {
            hideLoader();
        }, 2000);
    }

    function hideLoader() {
        loader.style.display = 'none';
    }

    // Mostrar loader cuando la página esté cargando
    showLoader();

    // Ocultar loader cuando la página haya cargado completamente
    window.addEventListener('load', function () {
        hideLoader();
    });

    // Mostrar loader en cualquier acción que implique cambios en la interfaz
    document.body.addEventListener('click', function (event) {
        showLoader();
        // Aquí puedes agregar lógica adicional según sea necesario
    });

    document.body.addEventListener('change', function (event) {
        showLoader();
        // Aquí puedes agregar lógica adicional según sea necesario
    });

    // Puedes agregar más eventos según las acciones que desees detectar

    // Ocultar loader después de ciertas acciones (simulando el final de la acción)
    document.body.addEventListener('customActionCompleted', function () {
        // Realiza las acciones necesarias después de la acción (simulado aquí con un temporizador)
        setTimeout(function () {
            hideLoader();
        }, 2000); // Puedes ajustar el tiempo según sea necesario
    });

    // Simula una acción personalizada que debería desencadenar la ocultación del loader
    document.body.dispatchEvent(new Event('customActionCompleted'));
});
