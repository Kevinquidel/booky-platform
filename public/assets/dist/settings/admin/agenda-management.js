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
const { getFirestore, doc, getDoc, setDoc, updateDoc, collection, onSnapshot } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

let currentUser = null;
let blockedDatesSet = new Set(); // Almacena fechas bloqueadas en formato 'YYYY-MM-DD'
let exceptionsList = []; // Almacena las excepciones de horario

// Elementos del DOM
const loadingOverlay = document.getElementById("loadingOverlay");
const syncDot = document.getElementById("syncDot");
const syncText = document.getElementById("syncText");
const toastContainer = document.getElementById("toast-container");
const emergencyModal = document.getElementById("emergencyModal");
const emergencyToggle = document.getElementById("emergencyClosureToggle");
const cancelEmergencyBtn = document.getElementById("cancelEmergencyBtn");
const confirmEmergencyBtn = document.getElementById("confirmEmergencyBtn");
const agendaForm = document.getElementById("agenda-config-form");
const calendarGrid = document.getElementById("interactiveCalendarGrid");
const monthYearLabel = document.getElementById("currentMonthYearLabel");

let previousEmergencyState = false;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log('Administrador autenticado:', user.email);
        await cargarConfiguracionAgenda();
        inicializarEscuchaAlertasAdmin();
    } else {
        console.log('Usuario no autenticado');
        window.location.href = "login.html";
    }
});

// Función para mostrar alertas flotantes (Toast)
function mostrarToast(mensaje, tipo = "success") {
    const toast = document.createElement("div");
    toast.className = `px-4 py-3 rounded-md shadow-lg text-sm text-white transition transform translate-y-2 opacity-0 ${
        tipo === "success" ? "bg-green-600" : "bg-red-600"
    }`;
    toast.textContent = mensaje;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove("translate-y-2", "opacity-0");
    }, 10);

    setTimeout(() => {
        toast.classList.add("translate-y-2", "opacity-0");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Actualizar indicador de sincronización perfeccionado
function actualizarSync(estado, texto) {
    if (!syncText || !syncDot) return;
    syncText.textContent = texto;
    
    // Remover clases previas de animación/color
    syncDot.className = "w-2 h-2 rounded-full";
    
    if (estado === "synced") {
        syncDot.classList.add("bg-green-500");
    } else if (estado === "saving") {
        syncDot.classList.add("bg-yellow-500", "animate-pulse");
    } else if (estado === "error") {
        syncDot.classList.add("bg-red-500");
    }
}

// Escuchar en tiempo real las alertas de los clientes y filtrar las no leídas o sin campo
function inicializarEscuchaAlertasAdmin() {
    try {
        const q = collection(firestore, "ADMIN_ALERTS");
        
        onSnapshot(q, (snapshot) => {
            const alertasPendientes = snapshot.docs.filter(docSnap => {
                const data = docSnap.data();
                return data.leido === false || data.leido === undefined;
            });

            actualizarUIIndicadorAlertas(alertasPendientes.length, alertasPendientes);
        });
    } catch (error) {
        console.error("Error al configurar el escuchador de alertas:", error);
    }
}

// Inyectar o actualizar dinámicamente el contenedor visual de la alerta con opción de marcar como leídas
function actualizarUIIndicadorAlertas(cantidad, documentosPendientes = []) {
    let contenedorAlerta = document.getElementById("admin-emergency-alert-badge");

    if (!contenedorAlerta) {
        const targetSection = document.querySelector(".card, form") || agendaForm;
        if (!targetSection) return;

        contenedorAlerta = document.createElement("div");
        contenedorAlerta.id = "admin-emergency-alert-badge";
        contenedorAlerta.className = "mb-6 p-4 rounded-xl border transition-all duration-300 flex items-center justify-between shadow-sm";
        
        agendaForm.insertBefore(contenedorAlerta, agendaForm.firstChild);
    }

    if (cantidad > 0) {
        contenedorAlerta.style.display = "flex";
        contenedorAlerta.className = "mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 flex items-center justify-between shadow-sm animate-pulse";
        contenedorAlerta.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="relative flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                </span>
                <div>
                    <span class="font-semibold text-sm">Avisos de Cierre Activo:</span>
                    <p class="text-xs text-red-700">Hay clientes intentando agendar citas durante el bloqueo.</p>
                </div>
            </div>
            <div class="flex items-center space-x-3">
                <span class="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-inner">
                    ${cantidad}
                </span>
                <button type="button" id="marcarAlertasLeidasBtn" class="text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded font-medium transition shadow">
                    Marcar como leídas
                </button>
            </div>
        `;

        document.getElementById("marcarAlertasLeidasBtn").addEventListener("click", async () => {
            try {
                for (const d of documentosPendientes) {
                    const alertRef = doc(firestore, "ADMIN_ALERTS", d.id);
                    await updateDoc(alertRef, { leido: true });
                }
                mostrarToast("Alertas marcadas como leídas.");
            } catch (err) {
                console.error("Error al actualizar alertas:", err);
                mostrarToast("No se pudieron actualizar las alertas.", "error");
            }
        });
    } else {
        contenedorAlerta.style.display = "none";
    }
}

// Cargar la configuración desde SETTINGS/agenda-configuration en Firestore
async function cargarConfiguracionAgenda() {
    try {
        actualizarSync("saving", "Sincronizando...");
        const docRef = doc(firestore, "SETTINGS", "agenda-configuration");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            document.getElementById("openingTime").value = data.openingTime || "08:00";
            document.getElementById("closingTime").value = data.closingTime || "18:00";
            document.getElementById("slotInterval").value = data.slotInterval || "30";
            document.getElementById("bufferTime").value = data.bufferTime ?? 10;
            document.getElementById("bookingHorizon").value = data.bookingHorizon ?? 30;
            document.getElementById("maxUserAppointments").value = data.maxUserAppointments ?? 2;
            
            emergencyToggle.checked = !!data.emergencyClosure;
            previousEmergencyState = !!data.emergencyClosure;

            blockedDatesSet = new Set(data.blockedDates || []);
            exceptionsList = data.exceptions || [];
            renderizarExcepciones();
        } else {
            console.log("No existe configuración previa en SETTINGS/agenda-configuration. Usando valores predeterminados.");
        }

        renderizarCalendarioInteractivo();
        actualizarSync("synced", "Sincronizado");
    } catch (error) {
        console.error("Error al cargar la agenda:", error);
        mostrarToast("Error al cargar la configuración de la agenda.", "error");
        actualizarSync("error", "Error de sincronización");
    } finally {
        if (loadingOverlay) {
            loadingOverlay.classList.add("opacity-0");
            setTimeout(() => loadingOverlay.remove(), 300);
        }
    }
}

// Renderizar el calendario interactivo del mes actual
function renderizarCalendarioInteractivo() {
    calendarGrid.innerHTML = "";
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const nombresMeses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    monthYearLabel.textContent = `${nombresMeses[month]} ${year}`;

    const primerDiaIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDias = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < primerDiaIndex; i++) {
        const emptyDiv = document.createElement("div");
        calendarGrid.appendChild(emptyDiv);
    }

    for (let dia = 1; dia <= totalDias; dia++) {
        const mesStr = String(month + 1).padStart(2, '0');
        const diaStr = String(dia).padStart(2, '0');
        const fechaYMD = `${year}-${mesStr}-${diaStr}`;

        const btnDia = document.createElement("button");
        btnDia.type = "button";
        btnDia.textContent = dia;
        btnDia.className = "py-2 text-xs rounded-md font-medium transition focus:outline-none";

        const estaBloqueado = blockedDatesSet.has(fechaYMD);

        if (estaBloqueado) {
            btnDia.className += " bg-red-600 text-white hover:bg-red-700 shadow-sm";
        } else {
            btnDia.className += " bg-white border border-gray-200 text-gray-700 hover:bg-gray-100";
        }

        btnDia.addEventListener("click", () => {
            if (blockedDatesSet.has(fechaYMD)) {
                blockedDatesSet.delete(fechaYMD);
                btnDia.className = "py-2 text-xs rounded-md font-medium transition focus:outline-none bg-white border border-gray-200 text-gray-700 hover:bg-gray-100";
            } else {
                blockedDatesSet.add(fechaYMD);
                btnDia.className = "py-2 text-xs rounded-md font-medium transition focus:outline-none bg-red-600 text-white hover:bg-red-700 shadow-sm";
            }
        });

        calendarGrid.appendChild(btnDia);
    }
}

// Manejo de Excepciones de Horario con validaciones lógicas
document.getElementById("addExceptionBtn").addEventListener("click", () => {
    const fecha = document.getElementById("exceptionDate").value;
    const apertura = document.getElementById("exceptionOpen").value;
    const cierre = document.getElementById("exceptionClose").value;

    if (!fecha) {
        mostrarToast("Por favor selecciona una fecha para la excepción.", "error");
        return;
    }

    if (!apertura || !cierre) {
        mostrarToast("Debes especificar la hora de apertura y cierre especial.", "error");
        return;
    }

    if (apertura >= cierre) {
        mostrarToast("La hora de apertura especial debe ser anterior a la hora de cierre.", "error");
        document.getElementById("exceptionOpen").focus();
        return;
    }

    const yaExiste = exceptionsList.some(exc => exc.date === fecha);
    if (yaExiste) {
        mostrarToast("Ya existe una excepción configurada para esta fecha.", "error");
        return;
    }

    exceptionsList.push({ date: fecha, open: apertura, close: cierre });
    renderizarExcepciones();
    document.getElementById("exceptionDate").value = "";
    mostrarToast("Excepción agregada correctamente.");
});

function renderizarExcepciones() {
    const container = document.getElementById("exceptionsListContainer");
    container.innerHTML = "";

    if (exceptionsList.length === 0) {
        container.innerHTML = `<span class="text-xs text-gray-500 italic">No hay excepciones de horario configuradas.</span>`;
        return;
    }

    exceptionsList.forEach((exc, index) => {
        const item = document.createElement("div");
        item.className = "flex justify-between items-center bg-white p-2.5 rounded border border-gray-200 text-xs";
        item.innerHTML = `
            <span><strong>${exc.date}</strong> — Apertura: ${exc.open} | Cierre: ${exc.close}</span>
            <button type="button" class="text-red-600 hover:underline font-medium" data-index="${index}">Eliminar</button>
        `;

        item.querySelector("button").addEventListener("click", () => {
            exceptionsList.splice(index, 1);
            renderizarExcepciones();
        });

        container.appendChild(item);
    });
}

// Control del Modal de Emergencia
emergencyToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
        emergencyModal.classList.remove("hidden");
    } else {
        previousEmergencyState = false;
    }
});

cancelEmergencyBtn.addEventListener("click", () => {
    emergencyToggle.checked = previousEmergencyState;
    emergencyModal.classList.add("hidden");
});

confirmEmergencyBtn.addEventListener("click", () => {
    previousEmergencyState = true;
    emergencyModal.classList.add("hidden");
    mostrarToast("Cierre de emergencia activado. Recuerda guardar los cambios.", "error");
});

// Restablecer valores predeterminados y limpiar todo el formulario, calendario y excepciones
document.getElementById("resetDefaultsLink").addEventListener("click", () => {
    if (confirm("¿Deseas restablecer los valores predeterminados y limpiar fechas bloqueadas y excepciones?")) {
        document.getElementById("openingTime").value = "08:00";
        document.getElementById("closingTime").value = "18:00";
        document.getElementById("slotInterval").value = "30";
        document.getElementById("bufferTime").value = "10";
        document.getElementById("bookingHorizon").value = "30";
        document.getElementById("maxUserAppointments").value = "2";
        
        emergencyToggle.checked = false;
        previousEmergencyState = false;
        
        blockedDatesSet.clear();
        exceptionsList = [];
        
        renderizarExcepciones();
        renderizarCalendarioInteractivo();
        
        mostrarToast("Formulario, calendario y excepciones restablecidos.");
    }
});

// Guardar Configuración en SETTINGS/agenda-configuration dentro de Firestore con validación estricta
agendaForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const openingTime = document.getElementById("openingTime").value;
    const closingTime = document.getElementById("closingTime").value;
    const bufferTimeInput = document.getElementById("bufferTime");
    const bookingHorizonInput = document.getElementById("bookingHorizon");
    const maxAppointmentsInput = document.getElementById("maxUserAppointments");

    const bufferValue = Number(bufferTimeInput.value);
    const horizonValue = Number(bookingHorizonInput.value);
    const maxAppointmentsValue = Number(maxAppointmentsInput.value);

    if (openingTime >= closingTime) {
        mostrarToast("La hora de apertura general debe ser anterior a la hora de cierre.", "error");
        document.getElementById("openingTime").focus();
        return;
    }

    if (bufferValue < 0 || bufferValue > 60) {
        mostrarToast("El tiempo de búfer debe estar entre 0 y 60 minutos.", "error");
        bufferTimeInput.focus();
        return;
    }

    if (horizonValue < 1 || horizonValue > 365) {
        mostrarToast("El horizonte de reservas debe estar entre 1 y 365 días.", "error");
        bookingHorizonInput.focus();
        return;
    }

    if (maxAppointmentsValue < 1 || maxAppointmentsValue > 10) {
        mostrarToast("El límite de citas por usuario debe estar entre 1 y 10.", "error");
        maxAppointmentsInput.focus();
        return;
    }

    actualizarSync("saving", "Guardando cambios...");

    const payload = {
        openingTime,
        closingTime,
        slotInterval: document.getElementById("slotInterval").value,
        bufferTime: bufferValue,
        bookingHorizon: horizonValue,
        maxUserAppointments: maxAppointmentsValue,
        emergencyClosure: emergencyToggle.checked,
        blockedDates: Array.from(blockedDatesSet),
        exceptions: exceptionsList,
        updatedAt: new Date(),
        updatedBy: currentUser.email
    };

    try {
        const docRef = doc(firestore, "SETTINGS", "agenda-configuration");
        await setDoc(docRef, payload, { merge: true });
        actualizarSync("synced", "Sincronizado");
        mostrarToast("¡Configuración de la agenda guardada con éxito!");
    } catch (error) {
        console.error("Error al guardar la agenda:", error);
        actualizarSync("error", "Error al guardar");
        mostrarToast("Error al guardar en la base de datos.", "error");
    }
});