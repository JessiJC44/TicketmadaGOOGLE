import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Configuration will be loaded from the config file via fetch to avoid static import issues
// if we want to keep it simple and not use a bundler
let app, auth, db;

export async function initFirebase() {
    try {
        const response = await fetch('/firebase-applet-config.json');
        const firebaseConfig = await response.json();
        
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        
        console.log('[Firebase] Initialized successfully');
        return { app, auth, db };
    } catch (error) {
        console.error('[Firebase] Initialization failed:', error);
        return null;
    }
}

export function getFirebaseAuth() { return auth; }
export function getFirebaseDb() { return db; }

export async function loginWithGoogle() {
    console.log('[Firebase] loginWithGoogle called');
    if (!auth) {
        console.log('[Firebase] Initializing before login...');
        await initFirebase();
    }
    const provider = new GoogleAuthProvider();
    console.log('[Firebase] Provider created, opening popup...');
    try {
        const result = await signInWithPopup(auth, provider);
        console.log('[Firebase] Popup result received for:', result.user.email);
        const user = result.user;
        
        const userProfile = {
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            uid: user.uid,
            role: 'user',
            updatedAt: serverTimestamp()
        };

        // Sync to Firestore (non-blocking for login flow)
        setDoc(doc(db, 'users', user.uid), {
            ...userProfile,
            createdAt: serverTimestamp()
        }, { merge: true }).catch(err => {
            console.error('[Firebase] Failed to sync profile:', err);
            // We don't throw here to avoid blocking login if Firestore fails
        });

        console.log('[Firebase] Signed in user:', user.displayName);
        return {
            success: true,
            user: userProfile,
            token: await user.getIdToken()
        };
    } catch (error) {
        if (error.code === 'auth/popup-closed-by-user') {
            console.log('[Firebase] User closed the sign-in popup');
            return { success: false, canceled: true };
        }
        console.error('[Firebase] Sign-in error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Handle Firestore errors as per requirement
 */
function handleFirestoreError(error, operationType, path) {
    const auth = getAuth();
    const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            emailVerified: auth.currentUser?.emailVerified,
            isAnonymous: auth.currentUser?.isAnonymous,
            providerInfo: auth.currentUser?.providerData?.map(p => ({
                providerId: p.providerId,
                email: p.email,
            })) || []
        },
        operationType,
        path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
}

export async function logout() {
    if (!auth) return;
    try {
        await signOut(auth);
        console.log('[Firebase] Signed out');
        return { success: true };
    } catch (error) {
        console.error('[Firebase] Sign-out error:', error);
        return { success: false, error: error.message };
    }
}
