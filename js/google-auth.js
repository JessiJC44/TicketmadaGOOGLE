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

    // ── Public API ──
    const api = {
        /**
         * Initialize GIS. Call ONCE on page load.
         * The GIS library should be loaded via <script> BEFORE calling init().
         */
        init() {
            if (_initialized) return Promise.resolve();
            
            return new Promise((resolve) => {
                const check = () => {
                    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                        try {
                            const isDashboard = window.location.pathname.includes('dashboard') || window.location.pathname.includes('superadmin');
                            
                            google.accounts.id.initialize({
                                client_id: CLIENT_ID,
                                callback: _handleCredentialResponse,
                                auto_select: false,
                                ux_mode: 'popup', 
                                cancel_on_tap_outside: true,
                                itp_support: true, // Crucial for Safari/Brave
                                context: isDashboard ? 'use' : 'signup'
                            });

                            _initialized = true;
                            console.log('[GoogleAuth] Initialized successfully');
                            window.dispatchEvent(new CustomEvent('google-auth-initialized'));
                            resolve();
                        } catch (e) {
                            console.error('[GoogleAuth] Initialization error:', e);
                            resolve(); 
                        }
                    } else {
                        console.warn('[GoogleAuth] GIS library not loaded yet, retrying...');
                        setTimeout(check, 500);
                    }
                };
                check();
            });
        },

        /**
         * Render the official Google button. 
         * Much more robust than custom buttons in browsers like Brave.
         */
        renderButton(elementId, options = {}) {
            if (!_initialized) {
                console.warn('[GoogleAuth] Not initialized yet, waiting...');
                window.addEventListener('google-auth-initialized', () => this.renderButton(elementId, options), { once: true });
                return;
            }
            
            const el = document.getElementById(elementId);
            if (!el) return;

            google.accounts.id.renderButton(el, {
                theme: options.theme || 'outline',
                size: options.size || 'large',
                text: options.text || 'continue_with',
                shape: options.shape || 'rectangular',
                width: options.width || el.offsetWidth || 250,
                logo_alignment: 'left'
            });
            
            console.log('[GoogleAuth] Button rendered in:', elementId);
        },

        /**
         * Start Google login.
         * Enforced POPUP mode as requested.
         */
        async signIn() {
            if (!_initialized) await this.init();

            console.log('[GoogleAuth] signIn() requested');

            return new Promise((resolve, reject) => {
                _resolveSignIn = resolve;
                _rejectSignIn = reject;

                // Watchdog to detect blocked popups or library issues
                const signInTimeout = setTimeout(() => {
                    const isBrave = navigator.userAgent.includes('Brave');
                    console.error('[GoogleAuth] SignIn timeout (60s)');
                    let msg = isBrave 
                        ? 'Connexion bloquée par Brave. Veuillez désactiver les "Shields" (icône lion) pour ce site.'
                        : 'Délai de connexion dépassé. Vérifiez vos bloqueurs de publicité.';
                    reject(new Error(msg));
                }, 60000);

                try {
                    // Using the more robust Token flow which works better with standard buttons
                    const tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: 'email profile openid',
                        ux_mode: 'popup',
                        callback: async (tokenResponse) => {
                            clearTimeout(signInTimeout);
                            if (tokenResponse.error) {
                                if (tokenResponse.error === 'access_denied') {
                                    resolve({ canceled: true });
                                } else {
                                    reject(new Error(`Google Error: ${tokenResponse.error}`));
                                }
                                return;
                            }
                            
                            // Immediately fetch user info with the access token
                            try {
                                const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                                });
                                
                                if (infoRes.ok) {
                                    const payload = await infoRes.json();
                                    const user = {
                                        id: payload.sub,
                                        email: payload.email,
                                        name: payload.name,
                                        picture: payload.picture,
                                        token: tokenResponse.access_token,
                                        provider: 'google'
                                    };
                                    
                                    localStorage.setItem(TOKEN_KEY, user.token);
                                    localStorage.setItem(USER_KEY, JSON.stringify(user));
                                    console.log('[GoogleAuth] Success:', user.email);
                                    resolve(user);
                                } else {
                                    // Fallback if userinfo fails but token is valid
                                    resolve({ token: tokenResponse.access_token, email: 'user@google.com', needsSync: true });
                                }
                            } catch (e) {
                                console.error('[GoogleAuth] UserInfo fetch failed:', e);
                                resolve({ token: tokenResponse.access_token, email: 'user@google.com', needsSync: true });
                            }
                        }
                    });

                    // Trigger the popup
                    tokenClient.requestAccessToken();
                    
                } catch (e) {
                    clearTimeout(signInTimeout);
                    console.error('[GoogleAuth] Exception during signIn:', e);
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

    // Expose globally
    window._initGoogleAuth = () => api.init();
    return api;
})();

window.GoogleAuth = GoogleAuth;
