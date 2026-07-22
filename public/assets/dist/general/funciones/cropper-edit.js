// cropper-edit.js

import { subirFotoPerfilYActualizar } from './../../settings/users/change-profile-image.js';
import { firebaseConfig } from "../../settings/config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL } from "../../settings/config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);

const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth } = await import(FIREBASE_AUTH_URL);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Variable para el objeto Cropper
let cropper;

// ==========================================================================
// 1. CAPTURA DEL INPUT DE ARCHIVOS (GLOBAL Y BLINDADO)
// ==========================================================================
document.addEventListener('change', (event) => {
    if (event.target && event.target.id === 'botonSubirFoto') {
        const file = event.target.files[0];

        if (file) {
            console.log("📁 Archivo seleccionado con éxito:", file.name);
            mostrarModalRecorte(file);
        } else {
            console.error('No se seleccionó ningún archivo.');
        }
    }
});

// ==========================================================================
// 2. MOSTRAR MODAL Y PREPARAR LECTURA
// ==========================================================================
function mostrarModalRecorte(file) {
    const modalRecorte = document.getElementById('modalRecorte');
    const imagenRecorte = document.getElementById('imagenRecorte');

    if (!modalRecorte || !imagenRecorte) {
        console.error('No se encontró el modal de recorte o la imagen en el DOM.');
        return;
    }

    modalRecorte.style.display = 'block';

    const reader = new FileReader();
    reader.onload = function (e) {
        imagenRecorte.src = e.target.result;
        
        setTimeout(() => {
            iniciarCropper(imagenRecorte);
        }, 100);
    };

    reader.readAsDataURL(file);
}

// ==========================================================================
// 3. INICIALIZAR CROPPER
// ==========================================================================
function iniciarCropper(imagenRecorte) {
    const CropperLib = window.Cropper || Cropper;

    if (!CropperLib) {
        console.error('Error: La librería Cropper no está cargada en el navegador.');
        return;
    }

    if (imagenRecorte.naturalWidth > 0 && imagenRecorte.naturalHeight > 0) {
        if (cropper) {
            cropper.destroy();
        }

        cropper = new CropperLib(imagenRecorte, {
            viewMode: 1,
            aspectRatio: 1,
            autoCropArea: 0.8,
            modal: true,
            guides: false,
            highlight: false,
            background: false,
            movable: false,
            zoomable: false,
            rotatable: false,
        });
    } else {
        console.error('Error: La imagen no tiene dimensiones válidas.');
    }
}

// ==========================================================================
// 4. BOTÓN ACEPTAR RECORTE (COMPRESIÓN Y ENVÍO A FIRESTORE)
// ==========================================================================
document.addEventListener('click', async (event) => {
    if (event.target && event.target.id === 'btnAceptarRecorte') {
        try {
            const CompressorLib = window.Compressor || Compressor;
            const modalRecorte = document.getElementById('modalRecorte');

            if (!CompressorLib) {
                throw new Error('La librería Compressor no está cargada en el navegador.');
            }

            if (cropper) {
                cropper.getCroppedCanvas().toBlob(function (blob) {
                    new CompressorLib(blob, {
                        quality: 0.4,
                        mimeType: 'image/jpeg',
                        success: function (compressedBlob) {
                            const reader = new FileReader();
                            
                            reader.onload = async function (e) {
                                try {
                                    const base64data = e.target.result;

                                    if (!auth.currentUser) {
                                        throw new Error('No hay un usuario autenticado actualmente.');
                                    }

                                    if (!base64data || typeof base64data !== 'string') {
                                        throw new Error('El resultado del FileReader no es un string válido.');
                                    }

                                    console.log("Enviando Base64 a Firestore...", base64data.substring(0, 30) + "...");

                                    await subirFotoPerfilYActualizar(auth.currentUser.uid, base64data);

                                    if (modalRecorte) modalRecorte.style.display = 'none';
                                    cropper.destroy();
                                } catch (innerError) {
                                    console.error('Error al procesar la subida de la imagen:', innerError);
                                }
                            };

                            reader.readAsDataURL(compressedBlob);
                        },
                        error: function (err) {
                            console.error('Error al comprimir la imagen:', err.message);
                        },
                    });
                }, 'image/jpeg', 0.4); 
            } else {
                throw new Error('Error: Cropper no inicializado correctamente.');
            }
        } catch (error) {
            console.error('Error al obtener la imagen recortada:', error.message);
        }
    }
});

// ==========================================================================
// 5. BOTÓN CANCELAR RECORTE
// ==========================================================================
document.addEventListener('click', (event) => {
    if (event.target && event.target.id === 'btnCancelarRecorte') {
        const modalRecorte = document.getElementById('modalRecorte');
        if (modalRecorte) modalRecorte.style.display = 'none';
        if (cropper) {
            cropper.destroy();
        }
    }
});

export { mostrarModalRecorte };