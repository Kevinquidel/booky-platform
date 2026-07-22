document.addEventListener('DOMContentLoaded', function () {
    // 1. Buscamos el contenedor en tu index.html
    var contenedorGlobal = document.getElementById('booky-nav-container');
    
    if (!contenedorGlobal) {
        console.error('❌ ERROR: No encontré el div con id="booky-nav-container" en tu index.html');
        return;
    }

    // 2. Leemos la ruta que pusiste en el HTML
    var rutaHTML = contenedorGlobal.getAttribute('data-src');
    
    if (!rutaHTML) {
        console.error('❌ ERROR: El div no tiene la ruta en el atributo data-src');
        return;
    }

    console.log('📡 Intentando cargar el perfil desde:', rutaHTML);

    // 3. Traemos el archivo intacto
    fetch(rutaHTML)
        .then(response => {
            console.log(`🤖 Respuesta del servidor: Status ${response.status}`);
            if (!response.ok) {
                throw new Error(`No se encontró el archivo (Error ${response.status}). Revisa la ruta.`);
            }
            return response.text();
        })
        .then(html => {
            // 4. Inyectamos tu componente intacto
            contenedorGlobal.innerHTML = html;
            console.log('✅ Componente inyectado con éxito en la barra.');
        })
        .catch(error => {
            console.error('❌ Fallo crítico al cargar:', error.message);
        });
});