// Importar la configuración de Firebase
import { firebaseConfig } from "../config/firebase-config.js";
import { FIREBASE_APP_URL, FIREBASE_AUTH_URL, FIREBASE_FIRESTORE_URL } from "../config/firebase-config-urls.js";

// Imprimir las URLs para verificar que estén configuradas correctamente
console.log("FIREBASE_APP_URL:", FIREBASE_APP_URL);
console.log("FIREBASE_AUTH_URL:", FIREBASE_AUTH_URL);
console.log("FIREBASE_FIRESTORE_URL:", FIREBASE_FIRESTORE_URL);

// Inicializar la aplicación Firebase
const { initializeApp } = await import(FIREBASE_APP_URL);
const { getAuth, onAuthStateChanged } = await import(FIREBASE_AUTH_URL);
const { getFirestore, collection, getDocs, doc, updateDoc } = await import(FIREBASE_FIRESTORE_URL);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// Ejecutar verificación al cargar la autenticación
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await verificarYAsignarSuperAdminPrincipal();
    } else {
        console.log("No hay usuario autenticado para la verificación del superadmin.");
    }
});

/**
 * Identifica al primer usuario registrado en la colección USERS y le asigna el rol de superadmin de forma automática.
 */
async function verificarYAsignarSuperAdminPrincipal() {
    try {
        const usersCollectionRef = collection(firestore, "USERS");
        const querySnapshot = await getDocs(usersCollectionRef);

        if (querySnapshot.empty) {
            console.warn("La colección USERS está vacía. No se pudo asignar un superadmin principal.");
            return;
        }

        const usuariosArray = [];
        querySnapshot.forEach((docSnap) => {
            usuariosArray.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        // Ordenar por fecha de creación si está disponible
        usuariosArray.sort((a, b) => {
            const fechaA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (new Date(a.createdAt || 0).getTime());
            const fechaB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (new Date(b.createdAt || 0).getTime());
            return fechaA - fechaB;
        });

        const primerUsuario = usuariosArray[0];

        // Verificar si su rol actual ya es 'superadmin'
        if (primerUsuario.role !== 'superadmin') {
            const primerUsuarioRef = doc(firestore, "USERS", primerUsuario.id);
            await updateDoc(primerUsuarioRef, { role: 'superadmin' });
            console.log(`[Seguridad] El usuario ${primerUsuario.userEmail || primerUsuario.id} ha sido establecido automáticamente como Super Admin Principal.`);
        } else {
            console.log(`[Seguridad] El Super Admin principal ya está configurado correctamente.`);
        }

    } catch (error) {
        console.error("Error al verificar y asignar el superadmin principal:", error);
    }
}