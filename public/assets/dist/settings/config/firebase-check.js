// Versión del SDK de Firebase almacenado localmente
const FIREBASE_VERSION = '12.16.0';

// Función para cargar y mostrar el contenido en la pestaña con resaltado y numeración de líneas
function loadAndShowContent(filePath, tabId, statusId) {

  const tabContent = document.getElementById(tabId);
  const statusElement = document.getElementById(statusId);

  if (!tabContent) {
    console.error(`No se encontró el contenedor con ID: ${tabId}`);
    return;
  }

  // Limpiar contenido anterior
  tabContent.innerHTML = "";

  if (statusElement) {
    statusElement.innerHTML = "";
  }

  fetch(filePath)
    .then(response => {

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} (${response.statusText})`);
      }

      return response.text();

    })
    .then(data => {

      // Crear un elemento <pre> para mantener la estructura y agregar el código con numeración
      const codeElement = document.createElement('pre');
      const codeElementContent = document.createElement('code');

      codeElementContent.className = 'javascript';
      codeElementContent.contentEditable = false;
      codeElementContent.spellcheck = false;

      // Dividir las líneas del código y agregar numeración
      const lines = data.split('\n');

      lines.forEach(line => {

        const lineElement = document.createElement('div');
        lineElement.className = 'line';

        const lineContent = document.createElement('span');
        lineContent.className = 'line-content';
        lineContent.textContent = line;

        lineElement.appendChild(lineContent);
        codeElementContent.appendChild(lineElement);

      });

      codeElement.appendChild(codeElementContent);
      tabContent.appendChild(codeElement);

// Mensaje de éxito
if (statusElement) {

    const successMessage = document.createElement('a');

    successMessage.href = filePath;
    successMessage.target = '_blank';
    successMessage.rel = 'noopener noreferrer';
    successMessage.className = 'ok';

    successMessage.textContent = `📄 Abrir ${filePath.split('/').pop()}`;

    statusElement.appendChild(successMessage);

}

    })
    .catch(error => {

      console.error(`Error cargando "${filePath}":`, error);

      if (statusElement) {

        const errorMessage = document.createElement('p');
        errorMessage.className = 'failed';
        errorMessage.textContent = `Error al cargar contenido desde ${filePath}: ${error.message}`;

        statusElement.appendChild(errorMessage);

      }

    });

}

// Llama a la función para cargar el contenido en las pestañas
document.addEventListener('DOMContentLoaded', () => {

  loadAndShowContent('./firebase-config.js', 'configTab', 'configStatus');

  loadAndShowContent('./firebase-config-urls.js', 'urlsTab', 'urlsStatus');

loadAndShowContent(
    `/assets/firebase/sdk/${FIREBASE_VERSION}/`,
    'cdnTab',
    'printConsoleStatus',
    'firebase-sdk'
);

});


// PRINT CONSOLE TAB

// firebase-config-urls.js

const isValidUrl = async (url) => {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const printToConsoleStatus = (message, color = 'black', scriptName = 'SYSTEM') => {

    const printConsoleStatus = document.getElementById('printConsoleStatus');

    if (!printConsoleStatus) {
        console.warn('No existe el elemento #printConsoleStatus');
        return;
    }

    const isScrolledToBottom =
        printConsoleStatus.scrollHeight - printConsoleStatus.clientHeight <=
        printConsoleStatus.scrollTop + 5;

    const now = new Date();

    const time = now.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    let icon = 'ℹ️';

    switch (color) {
        case 'green':
            icon = '✔️';
            break;
        case 'red':
            icon = '❌';
            break;
        case 'orange':
            icon = '⚠️';
            break;
        case 'blue':
            icon = '🔹';
            break;
    }

    const newParagraph = document.createElement('p');

    newParagraph.style.color = color;
    newParagraph.style.margin = '4px 0';
    newParagraph.style.fontFamily = 'Consolas, monospace';
    newParagraph.style.fontSize = '13px';

    newParagraph.textContent =
        `[${time}] ${icon} [${scriptName}] ${message}`;

    printConsoleStatus.appendChild(newParagraph);

    if (isScrolledToBottom) {
        printConsoleStatus.scrollTop = printConsoleStatus.scrollHeight;
    }

};


const validateFirebaseUrl = async (url, scriptName) => {
  if (!(await isValidUrl(url))) {
    const errorMessage = `URL inválida o inaccesible en ${scriptName}: ${url}`;
    console.error(errorMessage);
    printToConsoleStatus(errorMessage, 'red', scriptName);
    return false;
  }
  const successMessage = `URL válida en ${scriptName}: ${url}`;
  console.log(successMessage);
  printToConsoleStatus(successMessage, 'green', scriptName);
  return true;
};

const validateFirebaseModule = (moduleName, url) => {
  console.log(`Validando el módulo ${moduleName}...`);
  return validateFirebaseUrl(url, 'firebase-config-urls.js');
};

const validateFirebaseConfigUrls = (firebaseUrls) => {
  for (const [moduleName, url] of Object.entries(firebaseUrls)) {
    if (!validateFirebaseModule(moduleName, url)) {
      return false;
    }
  }
  console.log('Todas las URLs son válidas en firebase-config-urls.js.');
  printToConsoleStatus('Todas las URLs son válidas en firebase-config-urls.js.', 'green', 'firebase-config-urls.js'); // Imprimir éxito en la consola de estado
  return true;
};

export { validateFirebaseConfigUrls };

// firebase-config.js

const isValidFirebaseConfig = (config) => {
  if (!config || typeof config !== 'object') {
    const errorMessage = 'Configuración de Firebase inválida en firebase-config.js. Debe ser un objeto.';
    console.error(errorMessage);
    printToConsoleStatus(errorMessage, 'red', 'firebase-config.js'); // Imprimir error en la consola de estado
    return false;
  }

  const requiredFields = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];

  for (const field of requiredFields) {
    if (!config[field]) {
      const errorMessage = `Campo requerido faltante en la configuración de Firebase en firebase-config.js: ${field}`;
      console.error(errorMessage);
      printToConsoleStatus(errorMessage, 'red', 'firebase-config.js'); // Imprimir error en la consola de estado
      return false;
    }
  }

  const successMessage = 'Configuración de Firebase válida en firebase-config.js.';
  console.log(successMessage);
  printToConsoleStatus(successMessage, 'green', 'firebase-config.js'); // Imprimir éxito en la consola de estado
  return true;
};



export { isValidFirebaseConfig };

