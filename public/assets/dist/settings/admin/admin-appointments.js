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
const { getFirestore, collection, getDocs, doc, getDoc, updateDoc } = await import(FIREBASE_FIRESTORE_URL);

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);

// Obtener instancias de auth y firestore
const auth = getAuth(app);
const firestore = getFirestore(app);

const tableBody = document.getElementById("appointments-table-body");
const navUsuarios = document.getElementById("nav-usuarios"); // Referencia al enlace de usuarios en la barra de navegación

// Función auxiliar para estandarizar el formato de la fecha y hora
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

// Escuchar cambios en el estado de autenticación y validar roles antes de permitir acceso
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('Usuario autenticado:', user.email);
        
        // 🔒 VALIDACIÓN DE SEGURIDAD POR ROL
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

        // Si es moderador, ocultamos automáticamente el enlace/botón de "Usuarios" en la barra de navegación
        if (rolUsuario === 'moderador' && navUsuarios) {
            navUsuarios.style.display = 'none';
        }

        console.log(`Acceso concedido al panel de citas. Rol detectado: ${rolUsuario}`);
        await cargarCitas();

    } else {
        console.log('Usuario no autenticado');
        window.location.href = "../login.html";
    }
});

// Función para obtener y listar todas las citas desde los documentos de cada usuario en la colección "USERS"
async function cargarCitas() {
    try {
        const querySnapshot = await getDocs(collection(firestore, "USERS"));
        if (!tableBody) return;
        tableBody.innerHTML = "";

        if (querySnapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No hay usuarios registrados en el sistema.</td></tr>`;
            return;
        }

        let totalCitasEncontradas = 0;

        querySnapshot.forEach((documentSnapshot) => {
            const userData = documentSnapshot.data();
            const userId = documentSnapshot.id;
            const clienteNombre = userData.displayName || 'Cliente General';
            const clienteEmail = userData.userEmail || userData.email || 'No registrado';
            const clienteTelefono = userData.phone || userData.telefono || 'No registrado';

            // Soportamos tanto el nuevo arreglo "citas" como campos antiguos por compatibilidad
            const listaCitas = userData.citas || (userData.cita ? [userData.cita] : []) || (userData.appointment ? [userData.appointment] : []);

            if (listaCitas.length > 0) {
                // Recorremos cada cita del usuario actual
                listaCitas.forEach((citaData, index) => {
                    totalCitasEncontradas++;

                    const servicio = citaData.serviceName || citaData.service || 'Servicio General';
                    
                    // Manejo y estandarización de fecha y hora
                    const fechaCruda = citaData.date || citaData.fecha;
                    const fechaFormateada = formatearFechaLegible(fechaCruda);

                    const estadoActual = citaData.status || citaData.estado || 'pendiente';

                    // Estilos dinámicos para los badges de estado
                    let badgeStyle = 'bg-yellow-100 text-yellow-800';
                    if (estadoActual === 'confirmada' || estadoActual === 'completed') {
                        badgeStyle = 'bg-green-100 text-green-800';
                    } else if (estadoActual === 'cancelada' || estadoActual === 'cancelled') {
                        badgeStyle = 'bg-red-100 text-red-800';
                    }

                    const row = document.createElement("tr");
                    // Estructura de la fila con datos del cliente, teléfono, correo y botones de copiado rápido
                    row.innerHTML = `
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
                            <select data-id="${userId}" data-index="${index}" class="status-selector bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5">
                                <option value="pendiente" ${estadoActual === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="confirmada" ${estadoActual === 'confirmada' ? 'selected' : ''}>Confirmada</option>
                                <option value="cancelada" ${estadoActual === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                            </select>
                            <button data-id="${userId}" data-index="${index}" class="btn-eliminar text-red-600 hover:text-red-900 font-semibold">Eliminar Cita</button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            }
        });

        if (totalCitasEncontradas === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No hay citas registradas en los perfiles de usuario.</td></tr>`;
            return;
        }

        activarBotonesAccionCitas();

    } catch (error) {
        console.error("Error al cargar las citas de los usuarios:", error);
        tableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-red-500">Error al conectar con la base de datos de usuarios.</td></tr>`;
    }
}

// Funcionalidad para actualizar estados o eliminar citas específicas dentro del documento del usuario
function activarBotonesAccionCitas() {
    // Evento para cambiar el estado de una cita específica en el arreglo
    document.querySelectorAll(".status-selector").forEach(select => {
        select.addEventListener("change", async (e) => {
            const userId = e.target.getAttribute("data-id");
            const targetIndex = parseInt(e.target.getAttribute("data-index"), 10);
            const nuevoEstado = e.target.value;

            if (confirm(`¿Estás seguro de cambiar el estado de la cita a "${nuevoEstado.toUpperCase()}"?`)) {
                try {
                    const userDocRef = doc(firestore, "USERS", userId);
                    const userSnap = await getDoc(userDocRef);
                    
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        let listaCitas = userData.citas || (userData.cita ? [userData.cita] : []);

                        // Modificamos el estado de la cita en la posición exacta del índice
                        if (listaCitas[targetIndex]) {
                            listaCitas[targetIndex].status = nuevoEstado;
                        }

                        // Actualizamos el documento completo enviando el arreglo modificado
                        await updateDoc(userDocRef, { 
                            citas: listaCitas
                        });
                        
                        alert("Estado de la cita actualizado con éxito en el perfil del usuario.");
                        cargarCitas();
                    }
                } catch (err) {
                    console.error("Error al actualizar estado de la cita:", err);
                    alert("Hubo un error al actualizar el estado.");
                    cargarCitas(); 
                }
            } else {
                cargarCitas(); 
            }
        });
    });

    // Evento para eliminar/remover una cita específica del arreglo de citas del usuario
    document.querySelectorAll(".btn-eliminar").forEach(button => {
        button.addEventListener("click", async (e) => {
            const userId = e.target.getAttribute("data-id");
            const targetIndex = parseInt(e.target.getAttribute("data-index"), 10);

            if (confirm("¿Estás seguro de eliminar esta cita del perfil del usuario?")) {
                try {
                    const userDocRef = doc(firestore, "USERS", userId);
                    const userSnap = await getDoc(userDocRef);

                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        let listaCitas = userData.citas || (userData.cita ? [userData.cita] : []);

                        // Filtramos el arreglo excluyendo únicamente la cita seleccionada por su índice
                        const citasActualizadas = listaCitas.filter((_, i) => i !== targetIndex);

                        // Guardamos el arreglo filtrado en Firestore
                        await updateDoc(userDocRef, { 
                            citas: citasActualizadas
                        });
                        
                        alert("Cita eliminada correctamente del perfil del usuario.");
                        cargarCitas();
                    }
                } catch (err) {
                    console.error("Error al eliminar la cita:", err);
                    alert("Hubo un error al intentar eliminar la cita.");
                }
            }
        });
    });
}