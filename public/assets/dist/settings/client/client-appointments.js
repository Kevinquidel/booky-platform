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
const { getFirestore, collection, getDocs, query, where, doc, updateDoc } = await import(FIREBASE_FIRESTORE_URL);

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

// Función auxiliar para formatear cualquier tipo de fecha (sea timestamp de firestore o texto)
function formatearFechaLegible(fechaInput) {
    if (!fechaInput) return 'Fecha no especificada';

    let fechaObjeto = fechaInput;
    if (typeof fechaInput.toDate === 'function') {
        fechaObjeto = fechaInput.toDate();
    } else {
        fechaObjeto = new Date(fechaInput);
    }

    if (isNaN(fechaObjeto.getTime())) {
        return 'Fecha inválida'; 
    }

    return fechaObjeto.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Función para obtener y mostrar todas las citas del usuario separadas por sección
async function cargarCitasCliente(userId) {
    const appointmentsContainer = document.getElementById("appointments-container");
    if (!appointmentsContainer) return;

    try {
        appointmentsContainer.innerHTML = `<p style="text-align: center; color: #64748b; font-size: 0.95rem;">Cargando tus citas...</p>`;
        
        const appointmentsRef = collection(firestore, "APPOINTMENT");
        const q = query(appointmentsRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        appointmentsContainer.innerHTML = "";

        if (querySnapshot.empty) {
            appointmentsContainer.innerHTML = `
                <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 8px;">No tienes ninguna cita programada actualmente.</p>
                    <a href="/content/booking.html" class="spa-link" style="color: #2563eb; font-weight: 600; text-decoration: underline; font-size: 0.9rem;">Agendar un nuevo servicio</a>
                </div>
            `;
            return;
        }

        // Recopilar y estructurar datos
        let citasArray = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            let fechaObj = new Date(0);
            const fechaCruda = data.dateTime || data.date || data.fecha;
            
            if (fechaCruda) {
                if (typeof fechaCruda.toDate === 'function') {
                    fechaObj = fechaCruda.toDate();
                } else {
                    fechaObj = new Date(fechaCruda);
                }
            }
            citasArray.push({ id: docSnap.id, ...data, fechaObj });
        });

        // Ordenar de la más reciente a la más antigua globalmente
        citasArray.sort((a, b) => b.fechaObj - a.fechaObj);

        // Separar en Citas Actuales y Historial
        const citasActuales = [];
        const historialCitas = [];

        citasArray.forEach(cita => {
            const estado = (cita.status || cita.estado || 'pendiente').toLowerCase();
            if (estado === 'cancelada' || estado === 'cancelled' || estado === 'completada' || estado === 'completed') {
                historialCitas.push(cita);
            } else {
                citasActuales.push(cita);
            }
        });

        // Función para renderizar sección
        const renderizarSeccion = (titulo, listaCitas, esHistorial = false) => {
            if (listaCitas.length === 0) return '';

            // Solo mostrar la opción de selección masiva si hay más de 1 cita actual
            const permitirSeleccion = !esHistorial && listaCitas.length > 1;

            let html = `
                <div style="margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                        <h3 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0; display: flex; align-items: center; gap: 8px;">
                            ${titulo} <span style="font-size: 0.8rem; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 12px;">${listaCitas.length}</span>
                        </h3>
                        
                        ${permitirSeleccion ? `
                            <div style="display: flex; align-items: center; gap: 12px; justify-content: flex-start; width: 100%;">
                                <label style="font-size: 0.85rem; color: #475569; font-weight: 500; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                    <input type="checkbox" id="activar-modo-seleccion" style="width: 16px; height: 16px; cursor: pointer; accent-color: #2563eb;"> 
                                    Seleccionar múltiples
                                </label>
                                <button type="button" id="btn-cancelar-seleccionadas" style="background-color: #fee2e2; color: #dc2626; border: 1px solid #fecaca; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.8rem; display: none; transition: background 0.15s;">
                                    🗑️ Cancelar seleccionadas (0)
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            `;

            listaCitas.forEach((citaData) => {
                const citaId = citaData.id;
                const servicio = citaData.serviceName || 'Servicio General';
                const fechaFormateada = formatearFechaLegible(citaData.dateTime || citaData.date || citaData.fecha);
                const estadoActual = (citaData.status || citaData.estado || 'pendiente').toLowerCase();

                let badgeBg = '#f1f5f9';
                let badgeColor = '#475569';
                let textoEstado = estadoActual.toUpperCase();

                if (estadoActual === 'confirmada' || estadoActual === 'completed') {
                    badgeBg = '#dcfce7';
                    badgeColor = '#16a34a';
                } else if (estadoActual === 'cancelada' || estadoActual === 'cancelled') {
                    badgeBg = '#fee2e2';
                    badgeColor = '#dc2626';
                } else if (estadoActual === 'pendiente') {
                    badgeBg = '#fef3c7';
                    badgeColor = '#d97706';
                }

                html += `
                    <div class="cita-row" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #fff;">
                        <div style="display: flex; align-items: center; gap: 14px;">
                            ${permitirSeleccion ? `
                                <input type="checkbox" class="cita-checkbox" data-id="${citaId}" style="width: 18px; height: 18px; cursor: pointer; accent-color: #2563eb; display: none;">
                            ` : ''}
                            <div>
                                <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem; margin-bottom: 2px;">${servicio}</div>
                                <div style="font-size: 0.82rem; color: #64748b;">${fechaFormateada}</div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="background-color: ${badgeBg}; color: ${badgeColor}; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.75rem; text-transform: uppercase;">
                                ${textoEstado}
                            </span>
                            ${!esHistorial ? `
                                <button type="button" class="btn-cancelar-individual" data-id="${citaId}" data-userid="${userId}" style="background-color: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.8rem; transition: background 0.15s;">
                                    Cancelar
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`;
            return html;
        };

        // Inyectar contenido
        let contenidoHTML = "";
        contenidoHTML += renderizarSeccion("📅 Citas Actuales", citasActuales, false);
        contenidoHTML += renderizarSeccion("📁 Historial de Citas", historialCitas, true);

        if (citasActuales.length === 0 && historialCitas.length === 0) {
            appointmentsContainer.innerHTML = `
                <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
                    <p style="color: #64748b; font-size: 0.95rem;">No tienes citas registradas.</p>
                </div>
            `;
        } else {
            appointmentsContainer.innerHTML = contenidoHTML;
        }

        // Lógica de activación del modo de selección múltiple con el checkbox superior
        const activarModoCheckbox = document.getElementById("activar-modo-seleccion");
        const checkboxes = appointmentsContainer.querySelectorAll(".cita-checkbox");
        const btnCancelarSeleccionadas = document.getElementById("btn-cancelar-seleccionadas");

        if (activarModoCheckbox) {
            activarModoCheckbox.addEventListener("change", (e) => {
                const mostrar = e.target.checked;
                checkboxes.forEach(chk => {
                    chk.style.display = mostrar ? "inline-block" : "none";
                    if (!mostrar) chk.checked = false; // Limpiar selección al desactivar
                });

                if (btnCancelarSeleccionadas) {
                    btnCancelarSeleccionadas.style.display = mostrar ? "inline-block" : "none";
                }

                // Restaurar botones individuales si se desactiva el modo múltiple
                const botonesIndividuales = appointmentsContainer.querySelectorAll(".btn-cancelar-individual");
                botonesIndividuales.forEach(btn => {
                    btn.style.display = "inline-block";
                });

                if (btnCancelarSeleccionadas) {
                    btnCancelarSeleccionadas.textContent = `🗑️ Cancelar seleccionadas (0)`;
                }
            });
        }

        const actualizarEstadoBtnMasivo = () => {
            const checkboxesChecked = appointmentsContainer.querySelectorAll(".cita-checkbox:checked");
            const haySeleccionados = checkboxesChecked.length > 0;

            if (btnCancelarSeleccionadas) {
                btnCancelarSeleccionadas.textContent = `🗑️ Cancelar seleccionadas (${checkboxesChecked.length})`;
            }

            // Ocultar o mostrar los botones individuales de "Cancelar" según si hay selección activa
            const filasCitas = appointmentsContainer.querySelectorAll(".cita-row");
            filasCitas.forEach(fila => {
                const btnIndiv = fila.querySelector(".btn-cancelar-individual");
                if (btnIndiv) {
                    // Si hay elementos seleccionados, ocultamos los botones individuales para priorizar la acción masiva
                    btnIndiv.style.display = haySeleccionados ? "none" : "inline-block";
                }
            });
        };

        checkboxes.forEach(chk => {
            chk.addEventListener("change", actualizarEstadoBtnMasivo);
        });

        // Evento para cancelar múltiples citas seleccionadas
        if (btnCancelarSeleccionadas) {
            btnCancelarSeleccionadas.addEventListener("click", async () => {
                const checkboxesChecked = appointmentsContainer.querySelectorAll(".cita-checkbox:checked");
                if (checkboxesChecked.length === 0) {
                    alert("Por favor, selecciona al menos una cita.");
                    return;
                }

                if (confirm(`¿Estás seguro de que deseas cancelar las ${checkboxesChecked.length} citas seleccionadas?`)) {
                    try {
                        const promesas = Array.from(checkboxesChecked).map(chk => {
                            const citaIdDoc = chk.getAttribute("data-id");
                            const citaDocRef = doc(firestore, "APPOINTMENT", citaIdDoc);
                            return updateDoc(citaDocRef, { status: 'cancelada' });
                        });

                        await Promise.all(promesas);
                        alert("Las citas seleccionadas han sido canceladas exitosamente.");
                        await cargarCitasCliente(userId);
                    } catch (err) {
                        console.error("Error al cancelar las citas:", err);
                        alert("Hubo un error al intentar cancelar las citas seleccionadas.");
                    }
                }
            });
        }

        // Activar eventos de cancelación individual
        const botonesCancelar = appointmentsContainer.querySelectorAll(".btn-cancelar-individual");
        botonesCancelar.forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const citaIdDoc = e.target.getAttribute("data-id");
                const uid = e.target.getAttribute("data-userid");

                if (confirm("¿Estás seguro de que deseas cancelar esta cita?")) {
                    try {
                        const citaDocRef = doc(firestore, "APPOINTMENT", citaIdDoc);
                        await updateDoc(citaDocRef, { status: 'cancelada' });
                        
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
            <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
                <p style="color: #ef4444; font-size: 0.9rem;">Error al cargar la información de tus citas.</p>
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