// assets/dist/settings/admin/admin-apis.js

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
const {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,
    getDocFromServer,
    onSnapshot,
    runTransaction,
    deleteField,
    updateDoc,
    query,
    orderBy
} = await import(FIREBASE_FIRESTORE_URL);

// Inicializar la aplicación Firebase
const app = initializeApp(firebaseConfig);

// Obtener instancias de auth y firestore
const auth = getAuth(app);
const firestore = getFirestore(app);

const credencialesRef = doc(firestore, "SETTINGS", "api_credentials");

const proveedores = [
    ["Pexels", "Imágenes", "https://www.pexels.com/api/"],
    ["Pixabay", "Imágenes", "https://pixabay.com/api/docs/"],
    ["Unsplash", "Imágenes", "https://unsplash.com/developers"],
    ["Flickr", "Imágenes", "https://www.flickr.com/services/api/"],
    ["Google Gemini", "Texto", "https://aistudio.google.com/apikey"],
    ["Groq", "Texto", "https://console.groq.com/keys"],
    ["OpenRouter", "Texto", "https://openrouter.ai/settings/keys"],
    ["Hugging Face", "Modelos de IA", "https://huggingface.co/settings/tokens"],
    ["OpenWeather", "Clima", "https://openweathermap.org/appid"],
    ["WeatherAPI", "Clima", "https://www.weatherapi.com/signup"],
    ["Geoapify", "Mapas", "https://www.geoapify.com/get-started-with-maps-api/"],
    ["Resend", "Correo", "https://resend.com/api-keys"],
    ["NASA", "Datos científicos", "https://api.nasa.gov/"]
];

const grupos = {
    imageApis: "Imágenes",
    textApis: "Texto",
    otherApis: "Otros"
};

const camposApi = Object.keys(grupos);
const normalizar = valor => String(valor ?? "").trim().toLocaleLowerCase("es");

export async function getBookyAPI(tipo, nombre = "") {
    try {
        const datos = (await getDocFromServer(credencialesRef)).data();
        const lista = datos?.[tipo === "image" ? "imageApis" : "textApis"];
        if (!Array.isArray(lista)) return null;
        return lista.find(item => normalizar(item?.name).includes(normalizar(nombre))) || lista[0] || null;
    } catch {
        return null;
    }
}

if (document.getElementById("credentials")) iniciarPanel();

function iniciarPanel() {
    const $ = id => document.getElementById(id);
    let sesion = 0;
    let autorizado = false;
    let guardando = false;
    let cancelarEscucha;
    let confirmarBorradoTodo = false;
    let temporizadorConfirmacion;

    const aviso = texto => {
        $("status").textContent = texto;
    };

    function resetConfirmacionTodo() {
        confirmarBorradoTodo = false;
        clearTimeout(temporizadorConfirmacion);
        const btn = $("delete-all-apis");
        if (btn) btn.textContent = "Eliminar todas";
    }

    function asegurarBotonBorrarTodo() {
        const panel = $("saved-panel");
        if (!panel || $("delete-all-apis")) return;

        const cabecera = panel.querySelector("div");
        const boton = document.createElement("button");
        boton.id = "delete-all-apis";
        boton.type = "button";
        boton.textContent = "Eliminar todas";
        boton.className = "cursor-pointer rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50";

        boton.onclick = () => {
            if (!autorizado || guardando) return;
            if (!confirmarBorradoTodo) {
                confirmarBorradoTodo = true;
                boton.textContent = "¿Confirmar borrar todas?";
                aviso("Haz clic de nuevo en «¿Confirmar borrar todas?» para eliminar todas las claves guardadas.");
                clearTimeout(temporizadorConfirmacion);
                temporizadorConfirmacion = setTimeout(resetConfirmacionTodo, 4500);
                return;
            }
            resetConfirmacionTodo();
            void eliminarTodas();
        };

        if (cabecera) {
            cabecera.append(boton);
        } else {
            panel.prepend(boton);
        }
    }

    asegurarBotonBorrarTodo();

    const selector = $("options");
    for (const [nombre, categoria] of proveedores) {
        selector.add(new Option(nombre + " · " + categoria, nombre));
    }
    selector.add(new Option("Otro proveedor…", ""));

    function proveedor() {
        return proveedores.find(p => p[0] === selector.value);
    }

    function elegir() {
        const p = proveedor();
        $("manual").hidden = Boolean(p);
        $("official").hidden = !p;
        $("official").href = p?.[2] || "#";
        $("guide").textContent = p
            ? "Abre la página oficial de " + p[0] + ", inicia sesión y copia la clave. Consulta allí los límites y el plan disponible."
            : "Indica el proveedor y escribe cualquier categoría que necesites.";
        $("help").textContent = p
            ? "Pega la clave para guardarla. Si la escribes, pulsa Intro."
            : "Confirma los datos antes de guardar.";
        $("apply").hidden = Boolean(p);
        for (const id of ["key", "kind", "site", "name"]) {
            $(id).value = "";
        }
        if (autorizado) aviso("");
    }

    selector.onchange = elegir;
    elegir();

    function actualizarEstadoControles() {
        const bloqueado = !autorizado || guardando;
        $("fields").disabled = bloqueado;
        selector.disabled = guardando;
        const btnAll = $("delete-all-apis");
        if (btnAll) btnAll.disabled = bloqueado;
        $("saved")?.querySelectorAll("button[data-delete-api]").forEach(btn => {
            btn.disabled = bloqueado;
        });
    }

    function listar(datos = {}) {
        asegurarBotonBorrarTodo();
        const lista = $("saved");
        lista.replaceChildren();

        for (const [grupo, titulo] of Object.entries(grupos)) {
            if (!Array.isArray(datos[grupo])) continue;
            datos[grupo].forEach((item, index) => {
                if (!item?.name || typeof item.value !== "string" || !item.value) return;

                const fila = document.createElement("li");

                const superior = document.createElement("div");
                superior.className = "flex items-start justify-between gap-3";

                const info = document.createElement("div");
                info.className = "grid gap-1";

                const nombre = document.createElement("strong");
                nombre.textContent = item.name;

                const detalle = document.createElement("small");
                detalle.textContent = (item.category || titulo) + (item.site ? " · " + item.site : "");

                info.append(nombre, detalle);

                const btnEliminar = document.createElement("button");
                btnEliminar.type = "button";
                btnEliminar.dataset.deleteApi = "1";
                btnEliminar.textContent = "Eliminar";
                btnEliminar.setAttribute("aria-label", "Eliminar clave de " + item.name);
                btnEliminar.className = "shrink-0 cursor-pointer rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";
                btnEliminar.onclick = () => {
                    void eliminarUna(grupo, index, item.name);
                };

                superior.append(info, btnEliminar);

                const pista = document.createElement("code");
                pista.textContent = item.value.length > 4 ? "•••• " + item.value.slice(-4) : "••••";

                fila.append(superior, pista);
                lista.append(fila);
            });
        }

        const total = lista.childElementCount;
        $("count").textContent = total;
        $("saved-panel").hidden = total === 0;
        $("layout").classList.toggle("has-keys", total > 0);
        if (total === 0) resetConfirmacionTodo();
        actualizarEstadoControles();
    }

    async function eliminarUna(grupo, index, nombreApi) {
        if (!autorizado || guardando) return;
        const turno = sesion;
        const uid = auth.currentUser?.uid;

        guardando = true;
        actualizarEstadoControles();
        aviso("Eliminando clave de " + nombreApi + "…");

        try {
            await runTransaction(firestore, async tx => {
                const datos = (await tx.get(credencialesRef)).data() || {};
                if (turno !== sesion || !autorizado || auth.currentUser?.uid !== uid) throw Error();

                const actual = datos[grupo];
                if (!Array.isArray(actual) || index < 0 || index >= actual.length) throw Error();

                const restante = actual.filter((_, i) => i !== index);
                const cambios = { updatedAt: Date.now() };
                cambios[grupo] = restante.length > 0 ? restante : deleteField();

                tx.set(credencialesRef, cambios, { merge: true });
            });

            if (turno === sesion && autorizado) {
                aviso("Clave de " + nombreApi + " eliminada.");
            }
        } catch (error) {
            console.error("Error eliminando clave:", error);
            if (turno === sesion && autorizado) {
                aviso("No se pudo eliminar la clave. Inténtalo de nuevo.");
            }
        } finally {
            if (turno === sesion) {
                guardando = false;
                actualizarEstadoControles();
            }
        }
    }

    async function eliminarTodas() {
        if (!autorizado || guardando) return;
        const turno = sesion;
        const uid = auth.currentUser?.uid;

        guardando = true;
        actualizarEstadoControles();
        aviso("Eliminando todas las claves guardadas…");

        try {
            await runTransaction(firestore, async tx => {
                const snap = await tx.get(credencialesRef);
                if (turno !== sesion || !autorizado || auth.currentUser?.uid !== uid) throw Error();
                if (!snap.exists()) return;

                const cambios = { updatedAt: Date.now() };
                for (const campo of camposApi) {
                    cambios[campo] = deleteField();
                }

                tx.set(credencialesRef, cambios, { merge: true });
            });

            if (turno === sesion && autorizado) {
                aviso("Todas las claves de API fueron eliminadas.");
            }
        } catch (error) {
            console.error("Error eliminando todas las claves:", error);
            if (turno === sesion && autorizado) {
                aviso("No se pudieron eliminar todas las claves. Inténtalo de nuevo.");
            }
        } finally {
            if (turno === sesion) {
                guardando = false;
                actualizarEstadoControles();
            }
        }
    }

    onAuthStateChanged(auth, async usuario => {
        const turno = ++sesion;
        cancelarEscucha?.();
        resetConfirmacionTodo();
        autorizado = false;
        guardando = false;
        $("key").value = "";
        listar();
        actualizarEstadoControles();

        if (!usuario) {
            aviso("Inicia sesión como administrador.");
            return;
        }

        aviso("Comprobando permisos…");
        try {
            const perfil = (await getDocFromServer(doc(firestore, "USERS", usuario.uid))).data();
            if (turno !== sesion) return;

            if (!["admin", "superadmin"].includes(perfil?.role) || perfil.estadoCuenta === false) {
                aviso("Solo un administrador activo puede gestionar las claves.");
                return;
            }

            cancelarEscucha = onSnapshot(
                credencialesRef,
                { includeMetadataChanges: true },
                snap => {
                    if (turno !== sesion || snap.metadata.hasPendingWrites) return;
                    if (snap.metadata.fromCache) {
                        if (!autorizado) aviso("Esperando confirmación de Firestore…");
                        return;
                    }
                    if (!autorizado) aviso("");
                    autorizado = true;
                    listar(snap.data());
                },
                error => {
                    console.error("Error leyendo credenciales:", error);
                    if (turno !== sesion) return;
                    autorizado = false;
                    $("key").value = "";
                    listar();
                    actualizarEstadoControles();
                    aviso("No se pudo leer la lista. Revisa los permisos y recarga la página.");
                }
            );
        } catch (error) {
            console.error("Error comprobando perfil:", error);
            if (turno === sesion) {
                aviso("No se pudo comprobar el perfil. Recarga para reintentar.");
            }
        }
    });

    async function guardar() {
        if (!autorizado || guardando || !$("credentials").reportValidity()) return;

        const turno = sesion;
        const uid = auth.currentUser?.uid;
        const p = proveedor();
        const nombre = p?.[0] || $("name").value.trim();
        const categoria = p?.[1] || $("kind").value.trim() || "Otros";
        const sitio = p?.[2] || $("site").value.trim();
        const clave = $("key").value.trim();

        if (!nombre || !clave || /\s/.test(clave)) {
            aviso("Comprueba el nombre y pega la clave completa sin espacios.");
            return;
        }

        if (sitio) {
            try {
                const u = new URL(sitio);
                if (u.protocol !== "https:" || u.username || u.password) throw Error();
            } catch {
                aviso("Introduce un sitio HTTPS o deja ese campo vacío.");
                return;
            }
        }

        const grupo = Object.keys(grupos).find(g => normalizar(grupos[g]) === normalizar(categoria)) || "otherApis";
        guardando = true;
        actualizarEstadoControles();
        aviso("Guardando…");

        try {
            await runTransaction(firestore, async tx => {
                const datos = (await tx.get(credencialesRef)).data() || {};
                if (turno !== sesion || !autorizado || auth.currentUser?.uid !== uid) throw Error();

                const cambios = { updatedAt: Date.now() };
                for (const campo of ["imageApis", "textApis", grupo]) {
                    if (datos[campo] != null && !Array.isArray(datos[campo])) throw Error();
                    cambios[campo] = [...(datos[campo] || [])];
                }

                const filas = cambios[grupo];
                const i = filas.findIndex(
                    x =>
                        normalizar(x?.name) === normalizar(nombre) &&
                        (grupo !== "otherApis" || normalizar(x.category || "Otros") === normalizar(categoria))
                );

                const registro = {
                    url: "",
                    ...filas[i],
                    name: nombre,
                    category: categoria,
                    value: clave
                };
                if (sitio) registro.site = sitio;

                if (i < 0) filas.push(registro);
                else filas[i] = registro;

                tx.set(credencialesRef, cambios, { merge: true });
            });

            if (turno === sesion && autorizado) {
                $("key").value = "";
                $("apply").hidden = Boolean(p);
                aviso("Clave de " + nombre + " guardada.");
            }
        } catch (error) {
            console.error("Error guardando clave:", error);
            if (turno === sesion && autorizado) {
                $("apply").hidden = false;
                aviso("No se pudo guardar. Puedes reintentar.");
            }
        } finally {
            if (turno === sesion) {
                guardando = false;
                actualizarEstadoControles();
            }
        }
    }

    $("credentials").onsubmit = e => {
        e.preventDefault();
        void guardar();
    };

    $("key").onkeydown = e => {
        if (e.key === "Enter") {
            e.preventDefault();
            void guardar();
        }
    };

    $("key").oninput = e => {
        if (proveedor() && e.inputType === "insertFromPaste") {
            void guardar();
        } else if (!proveedor() && !$("name").value && /^gsk_[A-Za-z0-9]+$/.test($("key").value.trim())) {
            $("name").value = "Groq";
            $("kind").value = "Texto";
            $("site").value = "https://console.groq.com/keys";
        }
    };
}