// Función para generar un identificador único
function generarIdentificadorUnico() {
    // Genera un UUID v4 aleatorio
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Función para mostrar el identificador único en la barra de direcciones
function mostrarIdentificadorUnico() {
    const identificador = generarIdentificadorUnico(); // Obtiene el identificador único
    const nuevaURL = window.location.origin + window.location.pathname + `?id=${identificador}`; // Crea la nueva URL con el identificador
    window.history.replaceState({ path: nuevaURL }, '', nuevaURL); // Actualiza la URL en la barra de direcciones sin agregar una nueva entrada en el historial
    console.log("Identificador único generado:", identificador); // Imprime el identificador en la consola
    document.getElementById('identificadorUnico').textContent = identificador; // Asigna el identificador al elemento span
}

// Espera a que la ventana se cargue completamente antes de llamar a la función para mostrar el identificador único
window.addEventListener('load', function() {
    mostrarIdentificadorUnico();
});
