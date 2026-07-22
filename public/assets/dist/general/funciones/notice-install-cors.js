(function() {
    // Verifica si ya se ha ejecutado este script para evitar conflictos
    if (window.hasExtensionScriptRun) {
      return;
    }
    window.hasExtensionScriptRun = true;
  
    // Detecta si el navegador es Edge o Chrome
    const isEdge = /Edg/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
  
    // Configura la URL de la página de extensiones según el navegador
    const extensionPageUrl = isEdge ? 'edge://extensions/' : 'chrome://extensions/';
  
    // Función para mostrar la notificación de instalación de extensión
    function showInstallNotice() {
      document.getElementById('extensionInstallNotice').style.display = 'block';
    }
  
    // Función para cerrar la notificación de instalación de extensión
    function closeInstallNotice() {
      document.getElementById('extensionInstallNotice').style.display = 'none';
    }
  
    // Evento de clic en el enlace de instalación de extensión en la notificación
    document.getElementById('InstallcopyInstructions').addEventListener('click', function(event) {
        var instructions = `Para instalar la extensión sin empaquetar, sigue estos pasos:\n
        1. Descarga el código desde el enlace proporcionado.\n
        2. Descomprime el archivo ZIP en tu computadora.\n
        3. Abre '${extensionPageUrl}' en tu navegador.\n
        4. Habilita el modo desarrollador.\n
        5. Haz clic en "Cargar desempaquetado" y selecciona la carpeta descomprimida.`;
        
        showNotification(instructions);
        
      event.preventDefault(); // Evita que el enlace redireccione
    });
  
    // Evento de clic en el botón de cerrar notificación de instalación de extensión
    document.getElementById('closeInstallNotice').addEventListener('click', closeInstallNotice);
  
    // Muestra la notificación de instalación de extensión cuando la página se carga
    document.addEventListener('DOMContentLoaded', showInstallNotice);
})();
