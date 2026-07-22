document.addEventListener("DOMContentLoaded", function() {
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(part => part.length > 0); // Filtrar partes vacías

    // Inicializar la variable para la ruta completa
    let fullPath = pathParts.join(' / ');

    // Si fullPath está vacío, significa que estamos en la raíz
    if (!fullPath) {
      fullPath = "Root"; // O "Home", dependiendo de la preferencia
    }

    console.log("La ruta completa es:", fullPath);

    // Mostrar la ruta completa en la página
    document.getElementById("categoryDisplay").textContent = "Ruta completa: " + fullPath;
});
