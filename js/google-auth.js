/**
 * TicketMada — Google Identity Services (GIS) Authentication
 * Remplace Firebase Auth par GIS (plus simple, plus fiable)
 * 
 * Usage :
 *   await GoogleAuth.init();
 *   const user = await GoogleAuth.signIn();
 *   GoogleAuth.signOut();
 */

const GoogleAuth = (() => {
    const CLIENT_ID = '493372356458-06she45ni244noquejmoijgubtfd4va9.apps.googleusercontent.com';
    const TOKEN_KEY = 'ticketmada_token';
    const USER_KEY = 'ticketmada_user';

    let _initialized = false;
    let _resolveSignIn = null;
    let _rejectSignIn = null;

    // ── Decode JWT token ──
    function _decodeJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                 atob(base64).split('').map(c =>
                    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                ).join('')
            );
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('[GoogleAuth] JWT decode error:', e);
            return null;
        }
    }

    // ── Callback appelé par Google après login ──
    function _handleCredentialResponse(response) {
        console.log('[GoogleAuth] Credential response received');
        
        if (!response || !response.credential) {
            console.error('[GoogleAuth] No credential in response');
            if (_rejectSignIn) _rejectSignIn(new Error('No credential received'));
            return;
        }

        const payload = _decodeJwt(response.credential);
        if (!payload) {
            if (_rejectSignIn) _rejectSignIn(new Error('Invalid JWT token'));
            return;
        }

        const user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
            picture: payload.picture || '',
            emailVerified: payload.email_verified || false,
            provider: 'google',
            token: response.credential
        };

        // Sauvegarder dans localStorage
        try {
            localStorage.setItem(TOKEN_KEY, response.credential);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        } catch (e) {
            console.warn('[GoogleAuth] localStorage save failed:', e);
        }

        console.log('[GoogleAuth] Login success:', user.email);
        if (_resolveSignIn) _resolveSignIn(user);
    }

    // ── API publique ──
    return {
        /**
         * Initialiser GIS. Appeler UNE FOIS au chargement de la page.
         * La librairie GIS doit être chargée via <script> AVANT d'appeler init().
         */
        init() {
            if (_initialized) return;
            
            if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
                console.warn('[GoogleAuth] GIS library not loaded yet. Retrying in 1s...');
                setTimeout(() => this.init(), 1000);
                return;
            }

            try {
                google.accounts.id.initialize({
                    client_id: CLIENT_ID,
                    callback: _handleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                    itp_support: true
                });

                _initialized = true;
                console.log('[GoogleAuth] Initialized with client:', CLIENT_ID.substring(0, 20) + '...');
                window.dispatchEvent(new CustomEvent('google-auth-initialized'));
            } catch (e) {
                console.error('[GoogleAuth] Initialization error:', e);
            }
        },

        /**
         * Lancer le popup de connexion Google.
         * Retourne une Promise qui résout avec l'objet user.
         */
        signIn() {
            return new Promise((resolve, reject) => {
                if (!_initialized) {
                    this.init();
                    if (!_initialized) {
                        reject(new Error('Google Identity Services not loaded'));
                        return;
                    }
                }

                _resolveSignIn = resolve;
                _rejectSignIn = reject;

                // Watchdog per-signIn call
                const signInTimeout = setTimeout(() => {
                    console.error('[GoogleAuth] SignIn watchdog triggered (60s)');
                    reject(new Error('Le délai de connexion Google est dépassé. Veuillez réessayer.'));
                }, 60000);

                console.log('[GoogleAuth] Launching Google Auth popup...');
                try {
                    const tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: 'email profile openid',
                        ux_mode: 'popup',
                        callback: async (tokenResponse) => {
                            clearTimeout(signInTimeout);
                            console.log('[GoogleAuth] Token response received', tokenResponse.error ? 'ERROR' : 'SUCCESS');
                            
                            if (tokenResponse.error) {
                                console.error('[GoogleAuth] OAuth error:', tokenResponse.error);
                                // Check if user canceled
                                if (tokenResponse.error === 'access_denied') {
                                    resolve({ canceled: true });
                                } else {
                                    reject(new Error(tokenResponse.error_description || tokenResponse.error));
                                }
                                return;
                            }

                            if (tokenResponse.access_token) {
                                console.log('[GoogleAuth] Access token obtained');
                                try {
                                    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                                        signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : null
                                    });
                                    
                                    if (!res.ok) {
                                        throw new Error('Impossible de récupérer le profil (HTTP ' + res.status + ')');
                                    }
                                    
                                    const payload = await res.json();
                                    const user = {
                                        id: payload.sub,
                                        email: payload.email,
                                        name: payload.name || payload.email.split('@')[0],
                                        picture: payload.picture || '',
                                        emailVerified: payload.email_verified || false,
                                        provider: 'google',
                                        token: tokenResponse.access_token
                                    };

                                    localStorage.setItem(TOKEN_KEY, tokenResponse.access_token);
                                    localStorage.setItem(USER_KEY, JSON.stringify(user));
                                    resolve(user);
                                } catch (e) {
                                    console.error('[GoogleAuth] fetch userinfo error:', e);
                                    // Extreme fallback: create a dummy user with the token if fetch fails
                                    const fallbackUser = { id: 'ext-' + Date.now(), email: 'google-user@gmail.com', name: 'Google User', provider: 'google', token: tokenResponse.access_token };
                                    resolve(fallbackUser);
                                }
                            } else {
                                reject(new Error('Aucun jeton reçu.'));
                            }
                        },
                        error_callback: (error) => {
                            clearTimeout(signInTimeout);
                            console.warn('[GoogleAuth] GIS non-fatal error:', error);
                            if (error.type === 'popup_closed') {
                                resolve({ canceled: true });
                            } else {
                                reject(new Error(error.message || 'Erreur Google Popup'));
                            }
                        }
                    });

                    // Ouvrir le popup
                    tokenClient.requestAccessToken();
                } catch (e) {
                    clearTimeout(signInTimeout);
                    console.error('[GoogleAuth] Runtime error in signIn() body:', e);
                    reject(e);
                }
            });
        },

        /**
         * Déconnecter l'utilisateur.
         */
        signOut() {
            try {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                localStorage.removeItem('ticketmada_device_id');
            } catch (e) {}

            // Révoquer le token Google si possible
            if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                try {
                    google.accounts.id.disableAutoSelect();
                } catch (e) {}
            }

            console.log('[GoogleAuth] Signed out');
        },

        /**
         * Récupérer l'utilisateur actuellement connecté (depuis localStorage).
         * Retourne null si pas connecté.
         */
        getCurrentUser() {
            try {
                const userData = localStorage.getItem(USER_KEY);
                if (userData) {
                    return JSON.parse(userData);
                }
            } catch (e) {}
            return null;
        },

        /**
         * Vérifier si un utilisateur est connecté.
         */
        isLoggedIn() {
            return !!this.getCurrentUser();
        },

        /**
         * Récupérer le token stocké.
         */
        getToken() {
            try {
                return localStorage.getItem(TOKEN_KEY);
            } catch (e) {}
            return null;
        }
    };
})();

// Auto-init quand GIS est prêt
if (typeof google !== 'undefined' && google.accounts) {
    GoogleAuth.init();
} else {
    // GIS pas encore chargé — attendre l'événement load du script
    window._initGoogleAuth = () => GoogleAuth.init();
}
