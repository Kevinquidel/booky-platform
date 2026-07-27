// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../config/firebase-config-urls.js";

console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);
const { getFirestore, doc, getDoc, collection, getDocs, addDoc, query, where } = await import(FIREBASE_FIRESTORE_URL);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

let currentUser = null;
let userDataCache = null;
let selectedServiceId = null;
let selectedServiceName = null;
let horaSeleccionadaFinal = null;

// Referencias del DOM vinculadas a tu estructura original
const formReserva = document.getElementById("booking-form");
const serviciosGridContainer = document.getElementById("services-grid-container");
const inputFecha = document.getElementById("appointment-datetime"); // Input de fecha tipo "date"
const contenedorHorarios = document.getElementById("available-slots-container");

// Inicializar el input de fecha bloqueado hasta que elijan servicio
if (inputFecha) {
    inputFecha.disabled = true;
    inputFecha.style.backgroundColor = "#f1f5f9";
    inputFecha.style.cursor = "not-allowed";
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('Cliente autenticado para reserva:', user.email);
        currentUser = user;

        const userDocRef = doc(firestore, "USERS", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            userDataCache = userSnap.data();
        }

        const agendaConfig = await obtenerConfiguracionActualizada();

        if (agendaConfig && agendaConfig.emergencyClosure) {
            mostrarAlertaCierreEmergencia();
            return;
        }

        await configurarRestriccionesFecha(agendaConfig);
        await cargarServiciosEnTarjetas();
        inicializarFormularioReserva(agendaConfig);
    } else {
        console.log('Usuario no autenticado');
        window.location.href = "login.html";
    }
});

// Alerta visual de cierre de emergencia
function mostrarAlertaCierreEmergencia() {
    const bookingItemCard = document.querySelector(".booking-item-card") || formReserva;
    if (bookingItemCard) {
        bookingItemCard.innerHTML = `
            <div style="background-color: #fef2f2; border: 2px solid #ef4444; border-radius: 12px; padding: 32px 24px; text-align: center; margin-top: 10px; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.1);">
                <div style="font-size: 3rem; margin-bottom: 12px;">🚨</div>
                <h3 style="color: #991b1b; font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">¡Cierre de Emergencia Activo!</h3>
                <p style="color: #b91c1c; font-size: 1rem; line-height: 1.5; margin-bottom: 20px;">
                    El negocio se encuentra temporalmente cerrado por disposición de la administración. Las reservas están suspendidas hasta nuevo aviso.
                </p>
                <button id="btn-enviar-alerta-admin" style="background-color: #dc2626; color: white; border: none; padding: 12px 20px; font-size: 0.95rem; font-weight: 600; border-radius: 8px; cursor: pointer; transition: background-color 0.2s;">
                    📩 Enviar aviso a la administración
                </button>
            </div>
        `;

        const btnAlerta = document.getElementById("btn-enviar-alerta-admin");
        if (btnAlerta) {
            btnAlerta.addEventListener("click", async () => {
                try {
                    btnAlerta.disabled = true;
                    btnAlerta.textContent = "Enviando aviso...";

                    const alertaData = {
                        userId: currentUser ? currentUser.uid : 'Anónimo',
                        clientEmail: currentUser ? currentUser.email : 'No registrado',
                        clientName: userDataCache?.displayName || userDataCache?.nombre || currentUser?.displayName || 'Cliente',
                        message: 'El cliente intentó agendar durante un cierre de emergencia y solicita atención.',
                        createdAt: new Date(),
                        leido: false
                    };

                    await addDoc(collection(firestore, "ADMIN_ALERTS"), alertaData);
                    alert("¡Aviso enviado correctamente a la administración!");
                    btnAlerta.textContent = "¡Aviso enviado con éxito!";
                } catch (error) {
                    console.error("Error al enviar alerta:", error);
                    alert("No se pudo enviar el aviso en este momento. Inténtalo más tarde.");
                    btnAlerta.disabled = false;
                    btnAlerta.textContent = "📩 Enviar aviso a la administración";
                }
            });
        }
    }
}

async function obtenerConfiguracionActualizada() {
    try {
        const configDocRef = doc(firestore, "SETTINGS", "agenda-configuration");
        const configSnap = await getDoc(configDocRef);
        if (configSnap.exists()) {
            return configSnap.data();
        }
    } catch (e) {
        console.warn("No se pudo obtener la configuración de agenda desde SETTINGS.");
    }
    return null;
}

// Función para verificar si un día está bloqueado por el administrador
function esFechaBloqueada(fechaStr, agendaConfig) {
    if (!agendaConfig) return false;

    const fechasBloqueadas = agendaConfig.blockedDates || agendaConfig.diasBloqueados || [];
    if (Array.isArray(fechasBloqueadas) && fechasBloqueadas.includes(fechaStr)) {
        return true;
    }

    const diasSemanaBloqueados = agendaConfig.blockedDaysOfWeek || agendaConfig.diasSemanaBloqueados || [];
    if (Array.isArray(diasSemanaBloqueados) && diasSemanaBloqueados.length > 0) {
        const [anio, mes, dia] = fechaStr.split('-').map(Number);
        const fechaObj = new Date(anio, mes - 1, dia);
        const diaSemana = fechaObj.getDay(); 
        if (diasSemanaBloqueados.includes(diaSemana) || diasSemanaBloqueados.includes(String(diaSemana))) {
            return true;
        }
    }

    return false;
}

async function configurarRestriccionesFecha(agendaConfigOverride = null) {
    if (!inputFecha) return;

    const agendaConfig = agendaConfigOverride || await obtenerConfiguracionActualizada();
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');

    inputFecha.min = `${anio}-${mes}-${dia}`;

    if (agendaConfig && agendaConfig.bookingHorizon) {
        const diasMax = Number(agendaConfig.bookingHorizon);
        const fechaMax = new Date();
        fechaMax.setDate(fechaMax.getDate() + diasMax);
        const maxAnio = fechaMax.getFullYear();
        const maxMes = String(fechaMax.getMonth() + 1).padStart(2, '0');
        const maxDia = String(fechaMax.getDate()).padStart(2, '0');
        inputFecha.max = `${maxAnio}-${maxMes}-${maxDia}`;
    }

    inputFecha.addEventListener("change", () => {
        if (!selectedServiceId) {
            // Estilo unificado y sobrio similar a los badges de estado del panel
            if (contenedorHorarios) {
                contenedorHorarios.innerHTML = `
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; text-align: left; margin-top: 6px;">
                        <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-right: 6px;">Aviso</span>
                        <span style="color: #475569; font-size: 0.85rem;">Por favor, selecciona primero un servicio de la lista.</span>
                    </div>
                `;
            }
            inputFecha.value = "";
            return;
        }

        horaSeleccionadaFinal = null;
        if (!inputFecha.value) return;

        if (esFechaBloqueada(inputFecha.value, agendaConfig)) {
            if (contenedorHorarios) {
                contenedorHorarios.innerHTML = `
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; text-align: left; margin-top: 6px;">
                        <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-right: 6px;">Bloqueado</span>
                        <span style="color: #475569; font-size: 0.85rem;">Este día se encuentra bloqueado por la administración.</span>
                    </div>
                `;
            }
            inputFecha.value = ""; 
            return;
        }

        if (selectedServiceId && inputFecha.value) {
            generarBotonesHorariosDisponibles(agendaConfig);
        }
    });
}

// Cargar servicios manteniendo la línea visual de tu aplicación
async function cargarServiciosEnTarjetas() {
    try {
        if (!serviciosGridContainer) return;
        serviciosGridContainer.innerHTML = '<p style="color: #64748b; font-size: 0.9rem;">Cargando servicios disponibles...</p>';
        
        const querySnapshot = await getDocs(collection(firestore, "SERVICES"));

        if (querySnapshot.empty) {
            serviciosGridContainer.innerHTML = '<p style="color: #64748b; font-size: 0.9rem;">No hay servicios disponibles en Firestore.</p>';
            return;
        }

        serviciosGridContainer.innerHTML = "";
        querySnapshot.forEach((docSnap) => {
            const serviceData = docSnap.data();
            const serviceId = docSnap.id;
            const serviceName = serviceData.name || serviceData.nombre || 'Servicio sin nombre';
            const servicePrice = serviceData.price || serviceData.precio ? ` - $${serviceData.price || serviceData.precio}` : '';
            const serviceDesc = serviceData.description || serviceData.descripcion || '';

            const card = document.createElement("div");
            card.className = "service-card-item";
            card.style.cssText = "cursor: pointer; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; background-color: #fff; transition: all 0.2s ease; margin-bottom: 8px;";
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: #1e293b; font-size: 0.95rem;">${serviceName}${servicePrice}</strong>
                    <span class="selection-tag" style="font-size: 0.8rem; color: #2563eb; font-weight: 600;">Seleccionar</span>
                </div>
                ${serviceDesc ? `<p style="font-size: 0.85rem; color: #64748b; margin: 6px 0 0 0;">${serviceDesc}</p>` : ''}
            `;

            card.addEventListener("click", () => {
                document.querySelectorAll(".service-card-item").forEach(c => {
                    c.style.borderColor = "#cbd5e1";
                    c.style.backgroundColor = "#fff";
                    c.querySelector(".selection-tag").textContent = "Seleccionar";
                    c.querySelector(".selection-tag").style.color = "#2563eb";
                });
                
                card.style.borderColor = "#2563eb";
                card.style.backgroundColor = "#f8fafc";
                card.querySelector(".selection-tag").textContent = "✔ Seleccionado";
                card.querySelector(".selection-tag").style.color = "#16a34a";

                selectedServiceId = serviceId;
                selectedServiceName = serviceName;

                // Habilitar el calendario una vez seleccionado el servicio
                if (inputFecha) {
                    inputFecha.disabled = false;
                    inputFecha.style.backgroundColor = "#fff";
                    inputFecha.style.cursor = "pointer";
                }

                // Limpiar aviso previo si existía
                if (contenedorHorarios) {
                    contenedorHorarios.innerHTML = '<span style="font-size: 0.85rem; color: #64748b; font-style: italic;">Selecciona una fecha para ver las horas disponibles.</span>';
                }

                if (inputFecha.value && !esFechaBloqueada(inputFecha.value, agendaConfigGlobal)) {
                    generarBotonesHorariosDisponibles();
                }
            });

            serviciosGridContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Error al cargar servicios:", error);
    }
}

let agendaConfigGlobal = null;
const originalObtenerConfig = obtenerConfiguracionActualizada;
async function obtenerConfiguracionConCache() {
    agendaConfigGlobal = await originalObtenerConfig();
    return agendaConfigGlobal;
}

// Generador de horarios interactivos
async function generarBotonesHorariosDisponibles(configOverride = null) {
    if (!contenedorHorarios) return;
    const config = configOverride || await obtenerConfiguracionActualizada();
    contenedorHorarios.innerHTML = "";

    const fechaSeleccionadaStr = inputFecha ? inputFecha.value : null;
    if (!fechaSeleccionadaStr) return;

    if (esFechaBloqueada(fechaSeleccionadaStr, config)) {
        contenedorHorarios.innerHTML = `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; text-align: left; margin-top: 6px;">
                <span style="display: inline-block; background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-right: 6px;">Bloqueado</span>
                <span style="color: #475569; font-size: 0.85rem;">Este día se encuentra bloqueado por la administración.</span>
            </div>
        `;
        return;
    }

    const openingTime = config?.openingTime || "08:00";
    const closingTime = config?.closingTime || "18:00";
    const intervalMinutes = parseInt(config?.slotInterval || "30");

    let [openH, openM] = openingTime.split(":").map(Number);
    let [closeH, closeM] = closingTime.split(":").map(Number);

    let currentMinutes = openH * 60 + openM;
    let endMinutes = closeH * 60 + closeM;

    const ahora = new Date();
    const anioActual = ahora.getFullYear();
    const mesActual = String(ahora.getMonth() + 1).padStart(2, '0');
    const diaActual = String(ahora.getDate()).padStart(2, '0');
    const hoyStr = `${anioActual}-${mesActual}-${diaActual}`;

    const esHoy = (fechaSeleccionadaStr === hoyStr);
    const horaActualMinutos = ahora.getHours() * 60 + ahora.getMinutes();

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;";

    let slotsCount = 0;

    while (currentMinutes < endMinutes) {
        let h = Math.floor(currentMinutes / 60);
        let m = currentMinutes % 60;

        if (esHoy && currentMinutes <= horaActualMinutos) {
            currentMinutes += intervalMinutes;
            continue;
        }

        let horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        const btnHora = document.createElement("button");
        btnHora.type = "button";
        btnHora.textContent = horaStr;
        btnHora.style.cssText = "padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem; font-weight: 600; color: #1e293b; background-color: #fff; cursor: pointer; transition: all 0.15s;";

        btnHora.addEventListener("click", () => {
            document.querySelectorAll("#available-slots-container button").forEach(b => {
                b.style.borderColor = "#cbd5e1";
                b.style.backgroundColor = "#fff";
                b.style.color = "#1e293b";
            });
            btnHora.style.borderColor = "#2563eb";
            btnHora.style.backgroundColor = "#2563eb";
            btnHora.style.color = "#fff";
            horaSeleccionadaFinal = horaStr;
        });

        wrapper.appendChild(btnHora);
        slotsCount++;
        currentMinutes += intervalMinutes;
    }

    if (slotsCount === 0) {
        contenedorHorarios.innerHTML = '<span style="font-size: 0.85rem; color: #ef4444;">No hay horarios disponibles para esta fecha.</span>';
    } else {
        contenedorHorarios.appendChild(wrapper);
    }
}

function inicializarFormularioReserva(configInicial) {
    if (!formReserva) return;

    formReserva.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentUser) {
            alert("Debes iniciar sesión para agendar una cita.");
            return;
        }

        if (!selectedServiceId) {
            alert("Por favor, selecciona un servicio haciendo clic en la lista.");
            return;
        }

        const fechaCruda = inputFecha ? inputFecha.value : null;
        if (!fechaCruda) {
            alert("Por favor, selecciona una fecha válida.");
            return;
        }

        const agendaConfigActual = await obtenerConfiguracionActualizada() || configInicial;

        if (esFechaBloqueada(fechaCruda, agendaConfigActual)) {
            alert("No es posible agendar: este día se encuentra bloqueado por la administración.");
            return;
        }

        if (!horaSeleccionadaFinal) {
            alert("Por favor, selecciona un horario disponible de la lista.");
            return;
        }

        const fechaSeleccionada = new Date(`${fechaCruda}T${horaSeleccionadaFinal}:00`);

        if (fechaSeleccionada < new Date()) {
            alert("No puedes agendar una cita en una fecha u hora que ya pasó.");
            return;
        }

        if (agendaConfigActual) {
            if (agendaConfigActual.emergencyClosure) {
                mostrarAlertaCierreEmergencia();
                return;
            }

            const limiteMaxCitas = Number(agendaConfigActual.maxUserAppointments || 2);
            const citasQuery = query(collection(firestore, "APPOINTMENT"), where("userId", "==", currentUser.uid));
            const citasSnap = await getDocs(citasQuery);
            
            let citasActivasCount = 0;
            citasSnap.forEach(docCita => {
                const estado = (docCita.data().status || '').toLowerCase();
                if (estado === 'pendiente' || estado === 'confirmada') citasActivasCount++;
            });

            if (citasActivasCount >= limiteMaxCitas) {
                alert(`Has alcanzado el límite máximo permitido de ${limiteMaxCitas} citas activas simultáneas.`);
                return;
            }
        }

        try {
            const nuevaCita = {
                userId: currentUser.uid,
                clientName: userDataCache?.displayName || userDataCache?.nombre || currentUser.displayName || 'Cliente',
                clientEmail: currentUser.email,
                clientPhone: userDataCache?.phone || userDataCache?.telefono || 'No registrado',
                serviceId: selectedServiceId,
                serviceName: selectedServiceName,
                dateTime: fechaSeleccionada,
                status: 'pendiente', 
                createdAt: new Date()
            };

            await addDoc(collection(firestore, "APPOINTMENT"), nuevaCita);

            alert("¡Cita agendada con éxito! Puedes verificar el estado en tu panel.");
            formReserva.reset();
            selectedServiceId = null;
            horaSeleccionadaFinal = null;
            if (inputFecha) {
                inputFecha.disabled = true;
                inputFecha.style.backgroundColor = "#f1f5f9";
                inputFecha.style.cursor = "not-allowed";
            }
            if (contenedorHorarios) contenedorHorarios.innerHTML = '<span style="font-size: 0.85rem; color: #64748b; font-style: italic;">Selecciona un servicio y una fecha para ver las horas disponibles.</span>';
            document.querySelectorAll(".service-card-item").forEach(c => {
                c.style.borderColor = "#cbd5e1";
                c.style.backgroundColor = "#fff";
                c.querySelector(".selection-tag").textContent = "Seleccionar";
                c.querySelector(".selection-tag").style.color = "#2563eb";
            });

        } catch (error) {
            console.error("Error al registrar la cita:", error);
            alert("Hubo un error al procesar tu reserva. Inténtalo de nuevo.");
        }
    });
}