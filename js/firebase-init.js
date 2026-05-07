// js/firebase-init.js — VERSION CORRIGÉE COMPLÈTE

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Config hardcodé
const firebaseConfig = {
    apiKey: "AIzaSyCbI7swghOahNGD45a0_nWdISfqRXSVeow",
    authDomain: "gen-lang-client-0272660678.firebaseapp.com",
    projectId: "gen-lang-client-0272660678",
    storageBucket: "gen-lang-client-0272660678.firebasestorage.app",
    messagingSenderId: "1031314955224",
    appId: "1:1031314955224:web:f00213e4a7ef20e689f0ad"
};

let app = null;
let auth = null;
let db = null;
let initialized = false;

export async function initFirebase() {
    if (initialized && app) return { app, auth, db };
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        initialized = true;
        console.log('[Firebase] Initialisé avec succès');
        return { app, auth, db };
    } catch (e) {
        console.error('[Firebase] Erreur initialisation:', e);
        return null;
    }
}

export function getFirebaseAuth() { return auth; }
export function getFirebaseDb() { return db; }

export async function loginWithGoogle() {
    try {
        if (!initialized) {
            const resInit = await initFirebase();
            if (!resInit) throw new Error('Firebase non initialisé');
        }
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        console.log('[Firebase] Ouvrant le popup Google...');
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        const userProfile = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            photo: user.photoURL || '',
            role: user.email === 'sedrayiokoraz@gmail.com' ? 'superadmin' : 'buyer',
            provider: 'google'
        };
        
        // Sauvegarder dans Firestore
        try {
            console.log('[Firebase] Mise à jour du profil Firestore...', user.uid);
            await setDoc(doc(db, 'users', user.uid), {
                ...userProfile,
                lastLogin: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp() // merge: true handles this if it exists
            }, { merge: true });
            console.log('[Firebase] Profil Firestore mis à jour.');
        } catch (firestoreError) {
            console.warn('[Firebase] Firestore update failed (it is okay if logic continues):', firestoreError.message);
        }
        
        const token = await user.getIdToken();
        return { success: true, user: userProfile, token };
        
    } catch (error) {
        console.error('[Firebase] Login Google échoué:', error);
        
        if (error.code === 'auth/popup-closed-by-user') {
            return { success: false, error: 'Popup fermé par l\'utilisateur', canceled: true };
        }
        if (error.code === 'auth/unauthorized-domain') {
            return { success: false, error: 'Domaine non autorisé dans Firebase Console.' };
        }
        if (error.code === 'auth/popup-blocked') {
            return { success: false, error: 'Popup bloqué.' };
        }
        
        return { success: false, error: error.message || 'Erreur de connexion' };
    }
}

export async function logout() {
    try {
        if (auth) await signOut(auth);
    } catch (e) {
        console.warn('[Firebase] Logout error:', e);
    }
}

// Auto-init au chargement du module
initFirebase();
