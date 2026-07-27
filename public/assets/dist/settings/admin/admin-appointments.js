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
const { getFirestore, collection, getDocs, doc, getDoc, updateDoc, query, orderBy } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);

// Obtener instancias de auth y firestore
const auth = getAuth(app);
const firestore = getFirestore(app);

const tableBody = document.getElementById("appointments-table-body");
const navUsuarios = document.getElementById("nav-usuarios");
const btnExportar = document.getElementById("btn-exportar");
const selectFiltroExportar = document.getElementById("filtro-exportar");
const contenedorFechas = document.getElementById("contenedor-fechas");
const inputFechaDesde = document.getElementById("fecha-desde");
const inputFechaHasta = document.getElementById("fecha-hasta");
const selectAllCheckbox = document.getElementById("select-all-checkbox");
const barraAccionesMasivas = document.getElementById("barra-acciones-masivas");
const contadorSeleccionados = document.getElementById("contador-seleccionados");
const btnMasivoConfirmar = document.getElementById("btn-masivo-confirmar");
const btnMasivoCancelar = document.getElementById("btn-masivo-cancelar");

// Estado de la pestaña activa ('hoy', 'futuras' o 'historial')
let pestanaActual = 'hoy';

// Función auxiliar para estandarizar el formato de la fecha y hora
function formatearFechaLegible(fechaInput) {
    if (!fechaInput) return 'Fecha no especificada';

    if (typeof fechaInput.toDate === 'function') {
        fechaInput = fechaInput.toDate();
    } else {
        fechaInput = new Date(fechaInput);
    }

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

// Función auxiliar para convertir cualquier formato de fecha a objeto Date estándar de JS (eliminando horas para comparar días limpios)
function obtenerInicioDia(fechaInput) {
    if (!fechaInput) return null;
    let fecha;
    if (typeof fechaInput.toDate === 'function') {
        fecha = fechaInput.toDate();
    } else {
        fecha = new Date(fechaInput);
    }
    if (isNaN(fecha.getTime())) return null;
    
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

// Escuchar cambios en el estado de autenticación y validar roles
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('Usuario autenticado:', user.email);
        
        const userDocRef = doc(firestore, "USERS", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
            console.error("El documento del usuario no existe en Firestore.");
            alert("Acceso denegado: Perfil no encontrado.");
            window.location.href = "../index.html"; 
            return;
        }

        const userData = userSnap.data();
        const rolUsuario = userData.role || 'cliente';
        const rolesPermitidos = ['superadmin', 'admin', 'moderador'];

        if (!rolesPermitidos.includes(rolUsuario)) {
            console.warn(`Acceso bloqueado: El usuario ${user.email} tiene el rol '${rolUsuario}' y no tiene permisos.`);
            alert("Acceso no autorizado: No tienes permisos para ver el panel de gestión de citas.");
            window.location.href = "../index.html"; 
            return;
        }

        if (rolUsuario === 'moderador' && navUsuarios) {
            navUsuarios.style.display = 'none';
        }

        console.log(`Acceso concedido al panel de citas. Rol detectado: ${rolUsuario}`);
        
        // Vincular componentes de interfaz y carga inicial
        inicializarBotonExportar();
        inicializarInterfazPestanas();
        inicializarFiltroFechasUI();
        inicializarSeleccionMasivaUI();
        await cargarCitasSegunPestana();

    } else {
        console.log('Usuario no autenticado');
        window.location.href = "../login.html";
    }
});

// Configurar dinámicamente las tres pestañas en la interfaz y adaptar las opciones de exportación según la sección
function inicializarInterfazPestanas() {
    const cambiarPestaña = async (nuevaPestana, idActivo) => {
        pestanaActual = nuevaPestana;
        ['tab-hoy', 'tab-futuras', 'tab-historial'].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            if (id === idActivo) {
                btn.className = "pb-2 font-semibold text-blue-600 border-b-2 border-blue-600 transition";
            } else {
                btn.className = "pb-2 font-semibold text-gray-500 hover:text-gray-700 transition";
            }
        });

        // Ocultar siempre los inputs de fecha al cambiar de pestaña
        if (contenedorFechas) {
            contenedorFechas.classList.remove('flex');
            contenedorFechas.classList.add('hidden');
        }

        // Limpiar selección masiva y ocultar barra o checkbox global si es historial
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.disabled = (nuevaPestana === 'historial');
        }
        actualizarBarraSeleccionMasiva();

        // Poblar el selector de exportación dinámicamente según la pestaña activa
        if (selectFiltroExportar) {
            if (nuevaPestana === 'hoy') {
                selectFiltroExportar.innerHTML = `
                    <option value="hoy">📅 Solo Citas de Hoy</option>
                    <option value="confirmada">✅ Solo Confirmadas</option>
                    <option value="pendiente">⏳ Solo Pendientes</option>
                    <option value="cancelada">❌ Solo Canceladas</option>
                `;
            } else if (nuevaPestana === 'futuras') {
                selectFiltroExportar.innerHTML = `
                    <option value="futuras">⏳ Todas las Próximas</option>
                    <option value="rango">📅 Por Rango de Fecha (Próximas)</option>
                    <option value="confirmada">✅ Solo Confirmadas</option>
                    <option value="pendiente">⏳ Solo Pendientes</option>
                `;
            } else if (nuevaPestana === 'historial') {
                selectFiltroExportar.innerHTML = `
                    <option value="historial">📁 Todo el Historial</option>
                    <option value="rango">📅 Por Rango de Fecha (Historial)</option>
                    <option value="cancelada">❌ Solo Canceladas/Pasadas</option>
                `;
            }
        }

        await cargarCitasSegunPestana();
    };

    const btnHoy = document.getElementById("tab-hoy");
    const btnFuturas = document.getElementById("tab-futuras");
    const btnHistorial = document.getElementById("tab-historial");

    if (btnHoy) btnHoy.addEventListener("click", () => cambiarPestaña('hoy', 'tab-hoy'));
    if (btnFuturas) btnFuturas.addEventListener("click", () => cambiarPestaña('futuras', 'tab-futuras'));
    if (btnHistorial) btnHistorial.addEventListener("click", () => cambiarPestaña('historial', 'tab-historial'));

    cambiarPestaña('hoy', 'tab-hoy');
}

// Mostrar u ocultar los inputs de fecha solo si se selecciona "rango" en futuras o historial
function inicializarFiltroFechasUI() {
    if (selectFiltroExportar && contenedorFechas) {
        selectFiltroExportar.addEventListener("change", (e) => {
            if (e.target.value === 'rango') {
                contenedorFechas.classList.remove('hidden');
                contenedorFechas.classList.add('flex');
            } else {
                contenedorFechas.classList.remove('flex');
                contenedorFechas.classList.add('hidden');
            }
        });
    }
}

// Cargar y filtrar citas según la pestaña seleccionada
async function cargarCitasSegunPestana() {
    try {
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">Cargando citas...</td></tr>`;

        const appointmentsQuery = query(
            collection(firestore, "APPOINTMENT"),
            orderBy("dateTime", "desc")
        );

        const querySnapshot = await getDocs(appointmentsQuery);

        if (querySnapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">No hay citas registradas en el sistema.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";
        
        const hoyInicio = obtenerInicioDia(new Date());
        let contadorMostrados = 0;
        const esSoloLectura = pestanaActual === 'historial';

        querySnapshot.forEach((documentSnapshot) => {
            const citaData = documentSnapshot.data();
            const fechaCruda = citaData.dateTime || citaData.date || citaData.fecha;
            const fechaCitaInicio = obtenerInicioDia(fechaCruda);

            if (!fechaCitaInicio) return;

            const esDeHoy = fechaCitaInicio.getTime() === hoyInicio.getTime();
            const esFutura = fechaCitaInicio.getTime() > hoyInicio.getTime();
            const esHistorial = fechaCitaInicio.getTime() < hoyInicio.getTime();

            if (pestanaActual === 'hoy' && !esDeHoy) return;
            if (pestanaActual === 'futuras' && !esFutura) return;
            if (pestanaActual === 'historial' && !esHistorial) return;

            contadorMostrados++;
            const appointmentId = documentSnapshot.id;
            const clienteNombre = citaData.clientName || citaData.displayName || 'Cliente General';
            const clienteEmail = citaData.clientEmail || citaData.email || 'No registrado';
            const clienteTelefono = citaData.clientPhone || citaData.phone || 'No registrado';
            const servicio = citaData.serviceName || citaData.service || 'Servicio General';
            const fechaFormateada = formatearFechaLegible(fechaCruda);
            const estadoActual = citaData.status || citaData.estado || 'pendiente';

            let badgeStyle = 'bg-yellow-100 text-yellow-800';
            if (estadoActual === 'confirmada' || estadoActual === 'completed') {
                badgeStyle = 'bg-green-100 text-green-800';
            } else if (estadoActual === 'cancelada' || estadoActual === 'cancelled') {
                badgeStyle = 'bg-red-100 text-red-800';
            }

            const row = document.createElement("tr");

            row.innerHTML = `
                <td class="px-4 py-4 whitespace-nowrap text-center">
                    ${esSoloLectura ? '<span class="text-gray-300">-</span>' : `
                        <input type="checkbox" data-id="${appointmentId}" class="cita-checkbox w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer">
                    `}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${clienteNombre}</td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div class="flex items-center gap-2">
                        <span>${clienteEmail}</span>
                        ${clienteEmail !== 'No registrado' ? `
                            <button onclick="navigator.clipboard.writeText('${clienteEmail}'); alert('Correo copiado al portapapeles');" class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition" title="Copiar correo">
                                📋 Copiar
                            </button>` : ''}
                    </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div class="flex items-center gap-2">
                        <span>${clienteTelefono}</span>
                        ${clienteTelefono !== 'No registrado' ? `
                            <button onclick="navigator.clipboard.writeText('${clienteTelefono}'); alert('Teléfono copiado al portapapeles');" class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition" title="Copiar teléfono">
                                📋 Copiar
                            </button>` : ''}
                    </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${servicio}</td>
                <td class="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${fechaFormateada}</td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeStyle}">
                        ${estadoActual.toUpperCase()}
                    </span>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-3">
                    ${esSoloLectura ? '<span class="text-xs text-gray-400 italic">Solo lectura</span>' : `
                        <select data-id="${appointmentId}" class="status-selector bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5">
                            <option value="pendiente" ${estadoActual === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="confirmada" ${estadoActual === 'confirmada' ? 'selected' : ''}>Confirmada</option>
                            <option value="cancelada" ${estadoActual === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                        </select>
                        <button data-id="${appointmentId}" class="btn-eliminar text-red-600 hover:text-red-900 font-semibold">Eliminar Cita</button>
                    `}
                </td>
            `;
            tableBody.appendChild(row);
        });

        if (contadorMostrados === 0) {
            let mensajeVacio = "No hay citas en esta sección.";
            if (pestanaActual === 'hoy') mensajeVacio = "No hay citas programadas para el día de hoy.";
            if (pestanaActual === 'futuras') mensajeVacio = "No hay citas programadas para fechas futuras.";
            if (pestanaActual === 'historial') mensajeVacio = "No hay registros en el historial.";

            tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">${mensajeVacio}</td></tr>`;
            return;
        }

        if (!esSoloLectura) {
            activarBotonesAccionCitas();
            vincularCheckboxesIndividuales();
        }

    } catch (error) {
        console.error("Error al cargar las citas:", error);
        tableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-red-500">Error al conectar con la base de datos de citas.</td></tr>`;
    }
}

// Configurar comportamiento para la selección masiva de casillas
function inicializarSeleccionMasivaUI() {
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener("change", (e) => {
            if (pestanaActual === 'historial') return;
            const checkboxes = document.querySelectorAll(".cita-checkbox");
            checkboxes.forEach(chk => {
                chk.checked = e.target.checked;
            });
            actualizarBarraSeleccionMasiva();
        });
    }

    if (btnMasivoConfirmar) {
        btnMasivoConfirmar.addEventListener("click", () => ejecutarAccionMasiva('confirmada'));
    }

    if (btnMasivoCancelar) {
        btnMasivoCancelar.addEventListener("click", () => ejecutarAccionMasiva('cancelada'));
    }
}

function vincularCheckboxesIndividuales() {
    const checkboxes = document.querySelectorAll(".cita-checkbox");
    checkboxes.forEach(chk => {
        chk.addEventListener("change", () => {
            actualizarBarraSeleccionMasiva();
            const total = checkboxes.length;
            const marcados = document.querySelectorAll(".cita-checkbox:checked").length;
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = total > 0 && total === marcados;
            }
        });
    });
}

function actualizarBarraSeleccionMasiva() {
    if (pestanaActual === 'historial') {
        if (barraAccionesMasivas) barraAccionesMasivas.classList.add('hidden');
        return;
    }

    const marcados = document.querySelectorAll(".cita-checkbox:checked");
    const cantidad = marcados.length;

    if (cantidad > 0) {
        if (barraAccionesMasivas) barraAccionesMasivas.classList.remove('hidden');
        if (contadorSeleccionados) contadorSeleccionados.textContent = `${cantidad} cita${cantidad > 1 ? 's' : ''} seleccionada${cantidad > 1 ? 's' : ''}`;
    } else {
        if (barraAccionesMasivas) barraAccionesMasivas.classList.add('hidden');
    }
}

async function ejecutarAccionMasiva(nuevoEstado) {
    if (pestanaActual === 'historial') return;
    
    const marcados = document.querySelectorAll(".cita-checkbox:checked");
    if (marcados.length === 0) return;

    const textoAccion = nuevoEstado === 'confirmada' ? 'confirmar' : 'cancelar';
    if (!confirm(`¿Estás seguro de ${textoAccion} las ${marcados.length} citas seleccionadas?`)) return;

    try {
        const promesas = Array.from(marcados).map(async (chk) => {
            const id = chk.getAttribute("data-id");
            const docRef = doc(firestore, "APPOINTMENT", id);
            return updateDoc(docRef, {
                status: nuevoEstado,
                updatedAt: new Date()
            });
        });

        await Promise.all(promesas);
        alert(`¡Citas ${nuevoEstado === 'confirmada' ? 'confirmadas' : 'canceladas'} con éxito!`);
        
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        actualizarBarraSeleccionMasiva();
        await cargarCitasSegunPestana();

    } catch (err) {
        console.error("Error al ejecutar acción masiva:", err);
        alert("Hubo un error al procesar algunas de las citas.");
        await cargarCitasSegunPestana();
    }
}

// Funcionalidad para actualizar estados individuales o eliminar documentos
function activarBotonesAccionCitas() {
    document.querySelectorAll(".status-selector").forEach(select => {
        select.addEventListener("change", async (e) => {
            const appointmentId = e.target.getAttribute("data-id");
            const nuevoEstado = e.target.value;

            if (confirm(`¿Estás seguro de cambiar el estado de la cita a "${nuevoEstado.toUpperCase()}"?`)) {
                try {
                    const appointmentDocRef = doc(firestore, "APPOINTMENT", appointmentId);
                    await updateDoc(appointmentDocRef, { 
                        status: nuevoEstado,
                        updatedAt: new Date()
                    });
                    alert("Estado de la cita actualizado con éxito.");
                    await cargarCitasSegunPestana();
                } catch (err) {
                    console.error("Error al actualizar estado de la cita:", err);
                    alert("Hubo un error al actualizar el estado.");
                    await cargarCitasSegunPestana(); 
                }
            } else {
                await cargarCitasSegunPestana(); 
            }
        });
    });

    document.querySelectorAll(".btn-eliminar").forEach(button => {
        button.addEventListener("click", async (e) => {
            const appointmentId = e.target.getAttribute("data-id");

            if (confirm("¿Estás seguro de eliminar permanentemente esta cita del sistema?")) {
                try {
                    const appointmentDocRef = doc(firestore, "APPOINTMENT", appointmentId);
                    await updateDoc(appointmentDocRef, { 
                        status: 'cancelada',
                        deletedAt: new Date()
                    });
                    alert("Cita marcada como cancelada/eliminada correctamente.");
                    await cargarCitasSegunPestana();
                } catch (err) {
                    console.error("Error al eliminar la cita:", err);
                    alert("Hubo un error al intentar eliminar la cita.");
                }
            }
        });
    });
}

// Función para exportar las citas considerando la pestaña activa y los filtros específicos
async function exportarCitasACSV() {
    try {
        const criterioFiltro = selectFiltroExportar ? selectFiltroExportar.value : pestanaActual;

        let fechaDesdeObj = null;
        let fechaHastaObj = null;
        if (criterioFiltro === 'rango') {
            if (!inputFechaDesde.value || !inputFechaHasta.value) {
                alert("Por favor selecciona tanto la fecha 'Desde' como la fecha 'Hasta' para generar el rango.");
                return;
            }
            fechaDesdeObj = new Date(inputFechaDesde.value + "T00:00:00");
            fechaHastaObj = new Date(inputFechaHasta.value + "T23:59:59");

            if (fechaDesdeObj > fechaHastaObj) {
                alert("La fecha 'Desde' no puede ser posterior a la fecha 'Hasta'.");
                return;
            }
        }

        const appointmentsQuery = query(
            collection(firestore, "APPOINTMENT"),
            orderBy("dateTime", "desc")
        );
        const querySnapshot = await getDocs(appointmentsQuery);

        if (querySnapshot.empty) {
            alert("No hay citas registradas en el sistema para exportar.");
            return;
        }

        let csvContent = "\uFEFFID Cita,Cliente,Email,Telefono,Servicio,Fecha y Hora,Estado\r\n";
        const hoyInicio = obtenerInicioDia(new Date());
        let exportadasCount = 0;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const fechaCruda = data.dateTime || data.date || data.fecha;
            
            let fechaCitaReal = null;
            if (typeof fechaCruda.toDate === 'function') {
                fechaCitaReal = fechaCruda.toDate();
            } else {
                fechaCitaReal = new Date(fechaCruda);
            }

            const fechaCitaInicio = obtenerInicioDia(fechaCitaReal);
            const estadoActual = (data.status || data.estado || 'pendiente').toLowerCase();

            if (!fechaCitaInicio) return;

            const esDeHoy = fechaCitaInicio.getTime() === hoyInicio.getTime();
            const esFutura = fechaCitaInicio.getTime() > hoyInicio.getTime();
            const esHistorial = fechaCitaInicio.getTime() < hoyInicio.getTime();

            if (pestanaActual === 'hoy') {
                if (!esDeHoy) return;
                if (criterioFiltro === 'confirmada' && estadoActual !== 'confirmada' && estadoActual !== 'completed') return;
                if (criterioFiltro === 'pendiente' && estadoActual !== 'pendiente') return;
                if (criterioFiltro === 'cancelada' && estadoActual !== 'cancelada' && estadoActual !== 'cancelled') return;
            } else if (pestanaActual === 'futuras') {
                if (!esFutura) return;
                if (criterioFiltro === 'rango') {
                    if (fechaCitaReal < fechaDesdeObj || fechaCitaReal > fechaHastaObj) return;
                }
                if (criterioFiltro === 'confirmada' && estadoActual !== 'confirmada' && estadoActual !== 'completed') return;
                if (criterioFiltro === 'pendiente' && estadoActual !== 'pendiente') return;
            } else if (pestanaActual === 'historial') {
                if (!esHistorial) return;
                if (criterioFiltro === 'rango') {
                    if (fechaCitaReal < fechaDesdeObj || fechaCitaReal > fechaHastaObj) return;
                }
                if (criterioFiltro === 'cancelada' && estadoActual !== 'cancelada' && estadoActual !== 'cancelled') return;
            }

            exportadasCount++;
            const id = docSnap.id;
            const cliente = `"${(data.clientName || data.displayName || 'Sin nombre').replace(/"/g, '""')}"`;
            const email = data.clientEmail || data.email || 'No registrado';
            const telefono = data.clientPhone || data.phone || 'No registrado';
            const servicio = `"${(data.serviceName || data.service || 'Servicio General').replace(/"/g, '""')}"`;
            const fechaStr = formatearFechaLegible(fechaCruda);

            csvContent += `${id},${cliente},${email},${telefono},${servicio},"${fechaStr}",${estadoActual}\r\n`;
        });

        if (exportadasCount === 0) {
            alert(`No hay citas que coincidan con el filtro seleccionado para exportar.`);
            return;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        
        const fechaHoyStr = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `citas_${pestanaActual}_${fechaHoyStr}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Error al exportar las citas:", error);
        alert("Hubo un error al generar el archivo CSV de exportación.");
    }
}

function inicializarBotonExportar() {
    if (btnExportar && !btnExportar.dataset.listenerAttached) {
        btnExportar.dataset.listenerAttached = "true";
        btnExportar.addEventListener("click", exportarCitasACSV);
    }
}