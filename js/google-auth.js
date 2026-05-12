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
                                ux_mode: 'popup', // Default to popup
                                cancel_on_tap_outside: true,
                                itp_support: true,
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
         */
        async signIn(uxMode = 'popup') {
            if (!_initialized) await this.init();

            console.log('[GoogleAuth] signIn() requested with mode:', uxMode);

            if (uxMode === 'redirect') {
                // For a true redirect flow that bypasses popup issues, 
                // we use the backend auth URL which is much more reliable.
                try {
                    const returnTo = encodeURIComponent(window.location.href);
                    const res = await fetch(`/api/auth/url?provider=google&return_to=${returnTo}`);
                    const data = await res.json();
                    if (data.url) {
                        window.location.href = data.url;
                        return new Promise(() => {}); // Stop execution
                    }
                } catch (e) {
                    console.error('[GoogleAuth] Failed to get redirect URL:', e);
                }
                
                // Fallback: try GSI redirect to current page
                google.accounts.id.initialize({
                    client_id: CLIENT_ID,
                    callback: _handleCredentialResponse,
                    ux_mode: 'redirect',
                    login_uri: window.location.origin + window.location.pathname,
                    itp_support: true
                });
                google.accounts.id.prompt();
                return new Promise(() => {}); 
            }

            return new Promise((resolve, reject) => {
                _resolveSignIn = resolve;
                _rejectSignIn = reject;

                // Watchdog per-signIn call
                const signInTimeout = setTimeout(() => {
                    console.error('[GoogleAuth] SignIn watchdog triggered (60s)');
                    const isBrave = navigator.userAgent.includes('Brave');
                    let msg = 'Délai de connexion dépassé.';
                    if (isBrave) msg += ' Sur Brave, désactivez les "Shields" (l\'icône lion) pour autoriser le popup, ou utilisez le mode redirection.';
                    reject(new Error(msg));
                }, 60000);

                try {
                    // Try the Access Token flow (standard)
                    const tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: 'email profile openid',
                        ux_mode: 'popup',
                        callback: async (tokenResponse) => {
                            clearTimeout(signInTimeout);
                            if (tokenResponse.error) {
                                if (tokenResponse.error === 'access_denied') resolve({ canceled: true });
                                else reject(new Error(tokenResponse.error));
                                return;
                            }
                            
                            // Try to get userinfo with the token
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
                                        token: tokenResponse.access_token
                                    };
                                    localStorage.setItem(TOKEN_KEY, user.token);
                                    localStorage.setItem(USER_KEY, JSON.stringify(user));
                                    resolve(user);
                                } else {
                                    resolve({ token: tokenResponse.access_token, email: 'pending@google.com', needsSync: true });
                                }
                            } catch (e) {
                                resolve({ token: tokenResponse.access_token, email: 'pending@google.com', needsSync: true });
                            }
                        }
                    });
                    tokenClient.requestAccessToken();
                } catch (e) {
                    clearTimeout(signInTimeout);
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
