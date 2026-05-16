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

    // ── Détection automatique du navigateur ──
    function _detectBrowser() {
        const ua = navigator.userAgent;
        if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
            return { name: 'brave', label: 'Brave' };
        }
        if (/Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua)) {
            return { name: 'safari', label: 'Safari' };
        }
        if (/Firefox/.test(ua)) {
            return { name: 'firefox', label: 'Firefox' };
        }
        if (/Edg\//.test(ua)) {
            return { name: 'edge', label: 'Edge' };
        }
        if (/Chrome/.test(ua)) {
            return { name: 'chrome', label: 'Chrome' };
        }
        return { name: 'other', label: 'votre navigateur' };
    }

    // ── Message d'aide adapté au navigateur ──
    function _getBrowserTip() {
        const browser = _detectBrowser();
        switch (browser.name) {
            case 'brave':
                return 'sur Brave, désactiver les Shields (icône lion) pour cette page';
            case 'safari':
                return 'sur Safari, aller dans Préférences → Confidentialité → décocher « Empêcher le suivi intersite »';
            case 'firefox':
                return 'sur Firefox, vérifier que la Protection renforcée contre le pistage n\'est pas en mode Strict';
            case 'chrome':
                return 'sur Chrome, désactiver les extensions de privacy (uBlock, Privacy Badger) temporairement';
            case 'edge':
                return 'sur Edge, vérifier les paramètres de prévention du suivi dans edge://settings/privacy';
            default:
                return 'vérifier les paramètres de confidentialité de votre navigateur';
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
        async signIn(uxMode = 'popup') {
            if (!_initialized) await this.init();
            console.log('[GoogleAuth] signIn() requested with mode:', uxMode);

            // ── Mode redirect (inchangé) ──
            if (uxMode === 'redirect') {
                try {
                    const returnTo = encodeURIComponent(window.location.href);
                    const res = await fetch(`/api/auth/url?provider=google&return_to=${returnTo}`);
                    const data = await res.json();
                    if (data.url) {
                        window.location.href = data.url;
                        return new Promise(() => {});
                    }
                } catch (e) {
                    console.error('[GoogleAuth] Failed to get redirect URL:', e);
                }
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

            // ══════════════════════════════════════════════════════════
            // MODE POPUP — FIX DÉFINITIF (3 MÉCANISMES EN PARALLÈLE)
            // ══════════════════════════════════════════════════════════

            return new Promise((resolve, reject) => {
                let resolved = false;

                // ── Fonctions utilitaires de résolution ──
                const cleanup = () => {
                    clearInterval(pollingInterval);
                    clearTimeout(globalTimeout);
                    window.removeEventListener('focus', onFocusBack);
                    document.removeEventListener('visibilitychange', onVisChange);
                };

                const doResolve = (user) => {
                    if (!resolved) {
                        resolved = true;
                        cleanup();
                        console.log('[GoogleAuth] Login resolved for:', user?.email || 'unknown');
                        resolve(user);
                    }
                };

                const doReject = (err) => {
                    if (!resolved) {
                        resolved = true;
                        cleanup();
                        reject(err);
                    }
                };

                // Snapshot localStorage AVANT le popup
                const userBefore = localStorage.getItem(USER_KEY);

                // ── Watchdog global : 45s max ──
                const globalTimeout = setTimeout(() => {
                    const browserTip = _getBrowserTip();
                    doReject(new Error(
                        'La connexion Google a pris trop de temps. ' +
                        'Essayez : (1) recharger la page, ' +
                        '(2) utiliser email/mot de passe' +
                        (browserTip ? ', (3) ' + browserTip : '') + '.'
                    ));
                }, 45000);

                // ══ MÉCANISME B : Polling localStorage toutes les 500ms ══
                // Attrape toute écriture — que ce soit par tokenClient callback,
                // par _handleCredentialResponse, ou par tout autre chemin.
                const pollingInterval = setInterval(() => {
                    if (resolved) return;
                    const currentUser = localStorage.getItem(USER_KEY);
                    if (currentUser && currentUser !== userBefore) {
                        try {
                            const user = JSON.parse(currentUser);
                            if (user && user.email) {
                                console.log('[GoogleAuth] POLLING detected login:', user.email);
                                doResolve(user);
                            }
                        } catch (e) { /* JSON invalide, on ignore */ }
                    }
                }, 500);

                // ══ MÉCANISME C : Focus/Visibility fallback ══
                // Quand le popup se ferme → le focus revient sur la page.
                // On attend 2s (le temps que les cookies se propagent),
                // puis on re-initialise google.accounts.id avec auto_select:true
                // et on appelle prompt(). GIS détecte la session Google
                // (cookie posé par le popup) et fire _handleCredentialResponse
                // → écriture localStorage → le polling B le détecte → résolu.
                const triggerPromptFallback = () => {
                    if (resolved) return;
                    console.log('[GoogleAuth] Focus returned. Triggering prompt() fallback in 2s...');
                    setTimeout(() => {
                        if (resolved) return;
                        try {
                            // Re-initialize avec auto_select pour sélection silencieuse
                            google.accounts.id.initialize({
                                client_id: CLIENT_ID,
                                callback: _handleCredentialResponse,
                                auto_select: true,
                                cancel_on_tap_outside: false,
                                itp_support: true,
                                context: 'use'
                            });
                            google.accounts.id.prompt((notification) => {
                                console.log('[GoogleAuth] Fallback prompt:', notification.getMomentType());
                                // Si prompt affiche One Tap → user clique → _handleCredentialResponse
                                // Si auto_select fonctionne → _handleCredentialResponse fire automatiquement
                                // Si prompt supprimé → on attend le timeout de 45s
                            });
                        } catch (e) {
                            console.warn('[GoogleAuth] Prompt fallback error:', e);
                        }
                    }, 2000);
                };

                const onFocusBack = () => {
                    window.removeEventListener('focus', onFocusBack);
                    document.removeEventListener('visibilitychange', onVisChange);
                    triggerPromptFallback();
                };
                const onVisChange = () => {
                    if (document.visibilityState === 'visible' && !resolved) {
                        window.removeEventListener('focus', onFocusBack);
                        document.removeEventListener('visibilitychange', onVisChange);
                        triggerPromptFallback();
                    }
                };
                window.addEventListener('focus', onFocusBack);
                document.addEventListener('visibilitychange', onVisChange);

                // ══ MÉCANISME A : tokenClient callback (standard) ══
                // On le garde — quand il marche, c'est le plus rapide.
                _resolveSignIn = doResolve;
                _rejectSignIn = doReject;

                try {
                    const tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: 'email profile openid',
                        ux_mode: 'popup',
                        callback: async (tokenResponse) => {
                            if (resolved) return;

                            if (tokenResponse.error) {
                                if (tokenResponse.error === 'access_denied') {
                                    doResolve({ canceled: true });
                                } else {
                                    doReject(new Error(tokenResponse.error));
                                }
                                return;
                            }

                            // Token recu — fetch user info
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
                                    doResolve(user);
                                } else {
                                    doResolve({
                                        token: tokenResponse.access_token,
                                        email: 'pending@google.com',
                                        needsSync: true
                                    });
                                }
                            } catch (e) {
                                doResolve({
                                    token: tokenResponse.access_token,
                                    email: 'pending@google.com',
                                    needsSync: true
                                });
                            }
                        }
                    });
                    tokenClient.requestAccessToken();
                } catch (e) {
                    doReject(e);
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
        },

        detectBrowser: _detectBrowser,
        getBrowserTip: _getBrowserTip
    };

    // Expose globally
    window._initGoogleAuth = () => api.init();
    return api;
})();

window.GoogleAuth = GoogleAuth;
