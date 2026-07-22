// =========================================
// Configuración
// =========================================

import { printToConsoleStatus } from './firebase-check.js';

const FIREBASE_VERSION = '12.16.0';
const FIREBASE_BASE_URL = `/assets/firebase/sdk/${FIREBASE_VERSION}/`;

// SDK disponibles
const COMPONENTS = {
    app: 'firebase-app.js',
    auth: 'firebase-auth.js',
    firestore: 'firebase-firestore.js',
    storage: 'firebase-storage.js',
    database: 'firebase-database.js',
    messaging: 'firebase-messaging.js',
    functions: 'firebase-functions.js',
    analytics: 'firebase-analytics.js',
    performance: 'firebase-performance.js',
    remoteConfig: 'firebase-remote-config.js'
};

// =========================================
// Obtener información del SDK
// =========================================

async function obtenerVersionesFirebase() {

    const resultadoElement = document.getElementById('resultado');

    if (!resultadoElement) {
        console.error('No existe el elemento #resultado');
        return;
    }

    let componentesHTML = '<table border="1">';
    componentesHTML += '<tr><th>Componente</th><th>Estado</th></tr>';

    for (const [nombre, archivo] of Object.entries(COMPONENTS)) {

        const url = `${FIREBASE_BASE_URL}${archivo}`;

        const operativo = await verificarOperacionalidad(url);

        const icono = operativo ? '✔️' : '❌';
        const color = operativo ? 'green' : 'red';

componentesHTML += `
<tr>
    <td>
        <a
            href="${url}"
            target="_blank"
            rel="noopener noreferrer"
            style="color:${color};text-decoration:none;">
            ${archivo}
        </a>
    </td>

    <td style="color:${color}">
        ${icono}
    </td>
</tr>
`;

    }

    componentesHTML += '</table>';

    resultadoElement.innerHTML = `

        <p><strong>Versión local:</strong> ${FIREBASE_VERSION}</p>

        <p>
            <strong>Ruta Base:</strong>

<span
    class="copyable"
    onclick="copiarAlPortapapeles('${FIREBASE_BASE_URL}')">

    ${FIREBASE_BASE_URL}

</span>
        </p>

        ${componentesHTML}

    `;

}

// =========================================
// Verificar existencia
// =========================================

async function verificarOperacionalidad(url) {

    try {

        const response = await fetch(url, {
            method: 'HEAD',
            cache: 'no-store'
        });

        return response.ok;

    } catch {

        return false;

    }

}

// =========================================
// Copiar
// =========================================

function copiarAlPortapapeles(texto) {

    navigator.clipboard.writeText(texto)
        .then(() => {

            showNotification(`¡Copiado al portapapeles!\n\n${texto}`);

        })
        .catch(error => {

            console.error(error);

        });

}

// =========================================

obtenerVersionesFirebase();
window.copiarAlPortapapeles = copiarAlPortapapeles;