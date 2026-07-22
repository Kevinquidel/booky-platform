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
const { getFirestore, doc, getDoc, updateDoc } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);

// Obtener instancias de auth y firestore
const auth = getAuth(app);
const firestore = getFirestore(app);

// Escuchar cambios en el estado de autenticación del cliente
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('Cliente autenticado:', user.email);
        await cargarCitasCliente(user.uid);
    } else {
        console.log('Usuario no autenticado');
        window.location.href = "../login.html";
    }
});

// Función auxiliar para formatear cualquier tipo de fecha (sea string de input, texto viejo o timestamp)
function formatearFechaLegible(fechaInput) {
    if (!fechaInput) return 'Fecha no especificada';

    // Si es un Timestamp de Firestore
    if (typeof fechaInput.toDate === 'function') {
        fechaInput = fechaInput.toDate();
    } else {
        fechaInput = new Date(fechaInput);
    }

    // Si la fecha no es válida, devolvemos el texto original por seguridad
    if (isNaN(fechaInput.getTime())) {
        return fechaInput; 
    }

    return fechaInput.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Función para obtener y mostrar todas las citas del documento del usuario logueado
async function cargarCitasCliente(userId) {
    const appointmentsContainer = document.getElementById("appointments-container");
    if (!appointmentsContainer) return; // Si no estamos en la vista de citas, salimos

    try {
        appointmentsContainer.innerHTML = `<p style="text-align: center; color: #64748b;">Cargando tus citas...</p>`;
        
        const userDocRef = doc(firestore, "USERS", userId);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
            appointmentsContainer.innerHTML = `
                <div class="appointment-item-card" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <p style="color: #ef4444; text-align: center;">No se encontró el perfil del usuario.</p>
                </div>
            `;
            return;
        }

        const userData = userSnap.data();
        const listaCitas = userData.citas || (userData.cita ? [userData.cita] : []) || (userData.appointment ? [userData.appointment] : []);

        // Limpiar contenedor
        appointmentsContainer.innerHTML = "";

        if (listaCitas.length === 0) {
            appointmentsContainer.innerHTML = `
                <div class="appointment-item-card" style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
                    <p style="color: #64748b; font-size: 1rem; margin-bottom: 8px;">No tienes ninguna cita programada actualmente.</p>
                    <a href="/content/booking.html" class="spa-link" style="color: #2563eb; font-weight: 600; text-decoration: underline; font-size: 0.95rem;">Agendar un nuevo servicio</a>
                </div>
            `;
            return;
        }

        // Recorrer e inyectar cada cita encontrada en el arreglo
        listaCitas.forEach((citaData, index) => {
            const servicio = citaData.serviceName || citaData.service || 'Servicio General';
            
            // Usamos nuestra función unificada para formatear la fecha sin importar cómo esté guardada
            const fechaCruda = citaData.date || citaData.fecha;
            const fechaFormateada = formatearFechaLegible(fechaCruda);

            const estadoActual = citaData.status || citaData.estado || 'pendiente';

            // Estilos de color para el estado
            let colorEstado = '#2563eb';
            let textoEstadoCapitalizado = estadoActual.toUpperCase();
            if (estadoActual === 'confirmada' || estadoActual === 'completed') {
                colorEstado = '#16a34a';
            } else if (estadoActual === 'cancelada' || estadoActual === 'cancelled') {
                colorEstado = '#dc2626';
            }

            // Crear la tarjeta visual para cada cita
            const card = document.createElement("div");
            card.className = "appointment-item-card";
            card.style.cssText = "background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; gap: 12px; margin-bottom: 15px;";
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="font-size: 1.15rem; font-weight: 700; color: #1e293b; margin: 0;">Detalle de tu Cita #${index + 1}</h3>
                    <span style="background-color: #f1f5f9; color: ${colorEstado}; padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 0.85rem;">
                        ${textoEstadoCapitalizado}
                    </span>
                </div>
                <p style="margin: 0; color: #475569;"><strong>Servicio:</strong> <span style="color: #1e293b;">${servicio}</span></p>
                <p style="margin: 0; color: #475569;"><strong>Fecha y Hora:</strong> <span style="color: #1e293b;">${fechaFormateada}</span></p>
                
                ${estadoActual !== 'cancelada' ? `
                    <div style="margin-top: 10px; display: flex; gap: 10px;">
                        <button type="button" class="btn-cancelar-individual" data-index="${index}" data-userid="${userId}" style="background-color: #ef4444; color: white; padding: 10px 16px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem;">
                            Cancelar Cita
                        </button>
                    </div>
                ` : ''}
            `;

            appointmentsContainer.appendChild(card);
        });

        // Activar eventos de cancelación para cada botón generado
        const botonesCancelar = appointmentsContainer.querySelectorAll(".btn-cancelar-individual");
        botonesCancelar.forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const uid = e.target.getAttribute("data-userid");
                const targetIndex = parseInt(e.target.getAttribute("data-index"), 10);

                if (confirm("¿Estás seguro de que deseas cancelar esta cita?")) {
                    try {
                        const docRef = doc(firestore, "USERS", uid);
                        
                        const citasActualizadas = listaCitas.filter((_, i) => i !== targetIndex);

                        await updateDoc(docRef, { 
                            citas: citasActualizadas,
                        });
                        
                        alert("Tu cita ha sido cancelada exitosamente.");
                        await cargarCitasCliente(uid);
                    } catch (err) {
                        console.error("Error al cancelar la cita:", err);
                        alert("Hubo un error al intentar cancelar la cita.");
                    }
                }
            });
        });

    } catch (error) {
        console.error("Error al obtener las citas del usuario:", error);
        appointmentsContainer.innerHTML = `
            <div class="appointment-item-card" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <p style="color: #ef4444; text-align: center;">Error al cargar la información de tus citas.</p>
            </div>
        `;
    }
}

// Exportar función de inicialización para que content.js pueda llamarla
export function initAppointments() {
    const user = auth.currentUser;
    if (user) {
        cargarCitasCliente(user.uid);
    }
}