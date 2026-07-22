// firebase-config-urls.js
//import { validateFirebaseConfigUrls } from './firebase-check.js';

const FIREBASE_CDN_BASE_URL = 'https://www.gstatic.com/firebasejs/10.7.2/';

const MODULE_FILENAMES = {
    app: 'firebase-app.js',
    auth: 'firebase-auth.js',
    firestore: 'firebase-firestore.js',
    storage: 'firebase-storage.js',
    database: 'firebase-database.js',
    messaging: 'firebase-messaging.js',
    functions: 'firebase-functions.js',
    analytics: 'firebase-analytics.js',
    performance: 'firebase-performance.js',
    remoteConfig: 'firebase-remote-config.js',
};

// Crear constantes para cada módulo
const {
    app: APP_MODULE,
    auth: AUTH_MODULE,
    firestore: FIRESTORE_MODULE,
    storage: STORAGE_MODULE,
    database: DATABASE_MODULE,
    messaging: MESSAGING_MODULE,
    functions: FUNCTIONS_MODULE,
    analytics: ANALYTICS_MODULE,
    performance: PERFORMANCE_MODULE,
    remoteConfig: REMOTE_CONFIG_MODULE,
} = MODULE_FILENAMES;

export const FIREBASE_APP_URL = `${FIREBASE_CDN_BASE_URL}${APP_MODULE}`;
console.log('FIREBASE_APP_URL:', FIREBASE_APP_URL);

export const FIREBASE_AUTH_URL = `${FIREBASE_CDN_BASE_URL}${AUTH_MODULE}`;
console.log('FIREBASE_AUTH_URL:', FIREBASE_AUTH_URL);

export const FIREBASE_FIRESTORE_URL = `${FIREBASE_CDN_BASE_URL}${FIRESTORE_MODULE}`;
console.log('FIREBASE_FIRESTORE_URL:', FIREBASE_FIRESTORE_URL);

export const FIREBASE_STORAGE_URL = `${FIREBASE_CDN_BASE_URL}${STORAGE_MODULE}`;
console.log('FIREBASE_STORAGE_URL:', FIREBASE_STORAGE_URL);

export const FIREBASE_DATABASE_URL = `${FIREBASE_CDN_BASE_URL}${DATABASE_MODULE}`;
console.log('FIREBASE_DATABASE_URL:', FIREBASE_DATABASE_URL);

export const FIREBASE_MESSAGING_URL = `${FIREBASE_CDN_BASE_URL}${MESSAGING_MODULE}`;
console.log('FIREBASE_MESSAGING_URL:', FIREBASE_MESSAGING_URL);

export const FIREBASE_FUNCTIONS_URL = `${FIREBASE_CDN_BASE_URL}${FUNCTIONS_MODULE}`;
console.log('FIREBASE_FUNCTIONS_URL:', FIREBASE_FUNCTIONS_URL);

export const FIREBASE_ANALYTICS_URL = `${FIREBASE_CDN_BASE_URL}${ANALYTICS_MODULE}`;
console.log('FIREBASE_ANALYTICS_URL:', FIREBASE_ANALYTICS_URL);

export const FIREBASE_PERFORMANCE_URL = `${FIREBASE_CDN_BASE_URL}${PERFORMANCE_MODULE}`;
console.log('FIREBASE_PERFORMANCE_URL:', FIREBASE_PERFORMANCE_URL);

export const FIREBASE_REMOTE_CONFIG_URL = `${FIREBASE_CDN_BASE_URL}${REMOTE_CONFIG_MODULE}`;
console.log('FIREBASE_REMOTE_CONFIG_URL:', FIREBASE_REMOTE_CONFIG_URL);

// Validar las URLs utilizando MODULE_FILENAMES en lugar de firebaseUrls
//validateFirebaseConfigUrls(MODULE_FILENAMES);
