// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

// Importar las funciones necesarias del SDK de Firebase de forma dinámica
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);
const { getFirestore, doc, updateDoc, arrayUnion, collection, getDocs } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const firestore = getFirestore(app);

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('Cliente autenticado para reserva:', user.email);
        currentUser = user;
        await cargarServiciosEnSelect();
    } else {
        console.log('Usuario no autenticado');
        window.location.href = "login.html";
    }
});

// Función robusta para autoseleccionar el servicio desde la URL
function aplicarSeleccionDesdeUrl(selectElement) {
    if (!selectElement) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    // Soportamos tanto 'serviceId' como 'id' por compatibilidad con tu router
    const targetId = urlParams.get('serviceId') || urlParams.get('id');

    if (targetId) {
        // Verificamos si la opción existe en el select
        const optionToSelect = selectElement.querySelector(`option[value="${targetId}"]`);
        if (optionToSelect) {
            selectElement.value = targetId;
            selectElement.dispatchEvent(new Event('change'));
            console.log("Servicio autoseleccionado correctamente:", targetId);
        }
    }
}

// Función para poblar el select utilizando el ID del documento como valor
async function cargarServiciosEnSelect() {
    const serviceSelect = document.getElementById("service-select");
    if (!serviceSelect) return;

    try {
        const querySnapshot = await getDocs(collection(firestore, "SERVICES"));
        serviceSelect.innerHTML = '<option value="">-- Elige una opción --</option>';

        if (querySnapshot.empty) {
            serviceSelect.innerHTML = '<option value="">No hay servicios disponibles</option>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const servicio = docSnap.data();
            const option = document.createElement("option");
            
            // Usamos el ID del documento de Firestore como valor
            option.value = docSnap.id;

            // Guardamos el nombre real en un atributo data
            option.dataset.serviceName = servicio.name || servicio.customLabel || "Servicio General";

            // Construir el texto de la opción
            let detalleTexto = option.dataset.serviceName;

            const precioVal = servicio.price !== undefined ? servicio.price : servicio.customValue;
            if (precioVal !== null && precioVal !== undefined && precioVal !== "") {
                const monedaStr = servicio.currency ? `${servicio.currency} ` : '$';
                detalleTexto += ` (${monedaStr}${precioVal})`;
            }

            if (servicio.duration) {
                detalleTexto += ` — Duración: ${servicio.duration} min`;
            }

            option.textContent = detalleTexto;
            option.dataset.description = servicio.description || '';
            
            serviceSelect.appendChild(option);
        });

        // Intentar aplicar la selección de inmediato y con un pequeño respiro por el DOM dinámico
        aplicarSeleccionDesdeUrl(serviceSelect);
        setTimeout(() => aplicarSeleccionDesdeUrl(serviceSelect), 100);

    } catch (error) {
        console.error("Error al cargar servicios para el cliente:", error);
        serviceSelect.innerHTML = '<option value="">Error al cargar servicios</option>';
    }
}

export function initBookingForm() {
    const bookingForm = document.getElementById("booking-form");
    
    if (!bookingForm) return;

    const newForm = bookingForm.cloneNode(true);
    bookingForm.parentNode.replaceChild(newForm, bookingForm);

    if (currentUser) {
        cargarServiciosEnSelect();
    }

    const serviceSelect = newForm.querySelector("#service-select");
    const descContainer = document.getElementById("service-description-preview");

    if (serviceSelect && descContainer) {
        serviceSelect.addEventListener("change", (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const description = selectedOption ? selectedOption.dataset.description : '';
            
            if (description) {
                descContainer.textContent = description;
                descContainer.style.display = "block";
            } else {
                descContainer.textContent = "";
                descContainer.style.display = "none";
            }
        });
    }

    newForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentUser) {
            alert("Debes iniciar sesión para realizar una reserva.");
            return;
        }

        const bookingDateInput = newForm.querySelector("#booking-date");
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        
        const serviceName = selectedOption ? (selectedOption.dataset.serviceName || selectedOption.textContent) : "";
        const bookingDateValue = bookingDateInput.value;

        if (!serviceSelect.value) {
            alert("Por favor, selecciona un servicio válido.");
            return;
        }

        if (!bookingDateValue) {
            alert("Por favor, selecciona una fecha y hora para tu cita.");
            return;
        }

        const selectedDate = new Date(bookingDateValue);
        const now = new Date();

        if (selectedDate < now) {
            alert("No puedes agendar una cita en una fecha u hora pasada.");
            return;
        }

        try {
            const userDocRef = doc(firestore, "USERS", currentUser.uid);

            const nuevaCita = {
                id: Date.now().toString(),
                serviceName: serviceName,
                date: bookingDateValue,
                status: "pendiente",
                createdAt: new Date().toISOString()
            };

            await updateDoc(userDocRef, {
                citas: arrayUnion(nuevaCita)
            });

            alert("¡Reserva creada y guardada con éxito en tu perfil!");
            
            const targetUrl = `${window.location.origin}/content/appointments.html`;
            
            history.pushState({ path: targetUrl }, '', targetUrl);
            
            if (typeof window.loadDynamicContent === 'function') {
                window.loadDynamicContent(targetUrl);
            } else {
                window.location.reload();
            }

        } catch (error) {
            console.error("Error al guardar la reserva:", error);
            alert("Hubo un error al procesar tu reserva. Inténtalo de nuevo.");
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBookingForm);
} else {
    initBookingForm();
}