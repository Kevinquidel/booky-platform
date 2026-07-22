const developerModeNotice = document.getElementById('developerModeNotice');
const activateDeveloperModeLink = document.getElementById('activateDeveloperMode');
const copyInstructionsLink = document.getElementById('copyInstructions');
const closeNoticeButton = document.getElementById('closeNotice');

// Detecta si el navegador es Edge o Chrome
const isEdge = /Edg/.test(navigator.userAgent);
const isChrome = /Chrome/.test(navigator.userAgent);

if (isEdge || isChrome) {
    // Configura el texto del enlace con la URL correspondiente al navegador
    const extensionPageUrl = isEdge ? 'edge://extensions/' : 'chrome://extensions/';
    copyInstructionsLink.textContent = extensionPageUrl;

    // Muestra el aviso
    developerModeNotice.style.display = 'block';

    // Agrega un evento al enlace para copiar la URL
    copyInstructionsLink.addEventListener('click', function () {
        copyTextToClipboard(extensionPageUrl);
        showNotification("La URL se ha copiado al portapapeles: " + extensionPageUrl);
    });

    // Agrega un evento al enlace para activar el modo desarrollador
    activateDeveloperModeLink.addEventListener('click', function () {
        showNotification(`Para activar el Modo Desarrollador, sigue las instrucciones: haz clic en el enlace '${extensionPageUrl}'. Luego, abre una nueva pestaña, pega la URL en la barra de direcciones y presiona Enter.`);
    });
}

// Agrega un evento al botón para cerrar el aviso
closeNoticeButton.addEventListener('click', function () {
    developerModeNotice.style.display = 'none';
});

// Función para copiar texto al portapapeles
function copyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
}