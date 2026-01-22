
import { initializeApp, getApps, getApp, FirebaseApp, App, deleteApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth as getAdminAuth, Auth as AdminAuth } from 'firebase-admin/auth';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, cert, getApp as getAdminApp } from 'firebase-admin/app';
import { firebaseConfig } from './config';

let adminApp: App;

// This function is intended for server-side use ONLY.
export function initializeFirebase() {
    const apps = getApps();
    let firebaseApp: FirebaseApp;

    if (!apps.length) {
        // When running on the server, we must use the config object.
        firebaseApp = initializeApp(firebaseConfig);
    } else {
        firebaseApp = getApp();
    }
    
    // Initialize Firebase Admin SDK
    if (!getAdminApps().length) {
        // In a real production environment, you would use GOOGLE_APPLICATION_CREDENTIALS
        // or other secure methods. For this context, we assume a service account might be
        // configured or mocked.
        try {
           adminApp = initializeAdminApp();
        } catch(e) {
            console.warn("Admin SDK initialization failed. This may be expected in some environments.", e);
        }
    } else {
        adminApp = getAdminApp();
    }

    const firestore = getFirestore(firebaseApp);
    const auth = getAdminApps().length ? getAdminAuth(adminApp) : null;
    
    return { firebaseApp, firestore, auth };
}
