// TicketMada OAuth Simulation
// Simulates Google & Facebook login popups locally

window.OAuthSim = {
    // Pre-filled accounts for simulation
    googleAccounts: [
        { name: 'Sedra Yiokoraz', email: 'sedrayiokoraz@gmail.com', avatar: 'SY', color: '#4285F4' },
        { name: 'Rakoto Jean', email: 'rakoto.jean@gmail.com', avatar: 'RJ', color: '#34A853' },
        { name: 'Marie Razafy', email: 'marie.razafy@gmail.com', avatar: 'MR', color: '#EA4335' },
    ],
    facebookAccounts: [
        { name: 'Sedra Yiokoraz', email: 'sedrayiokoraz@gmail.com', avatar: 'SY', color: '#1877F2' },
        { name: 'Andry Rasolofoniaina', email: 'andry.rasolo@yahoo.fr', avatar: 'AR', color: '#1877F2' },
        { name: 'Nina Ralay', email: 'nina.ralay@outlook.com', avatar: 'NR', color: '#1877F2' },
    ],

    _overlay: null,

    show(provider, callback) {
        if (this._overlay) this._overlay.remove();

        const isGoogle = provider.toLowerCase() === 'google';
        const accounts = isGoogle ? this.googleAccounts : this.facebookAccounts;

        const overlay = document.createElement('div');
        overlay.id = 'oauth-sim-overlay';
        overlay.innerHTML = `
            <div class="oauth-sim-backdrop"></div>
            <div class="oauth-sim-window ${isGoogle ? 'google' : 'facebook'}">
                <div class="oauth-sim-header">
                    ${isGoogle ? `
                        <svg class="oauth-sim-logo" viewBox="0 0 74 24" width="74" height="24">
                            <path fill="#4285F4" d="M9.24 8.19v2.46h5.88c-.18 1.38-.64 2.39-1.34 3.1-.86.86-2.2 1.8-4.54 1.8-3.62 0-6.45-2.92-6.45-6.54s2.83-6.54 6.45-6.54c1.95 0 3.38.77 4.43 1.76L15.4 2.5C13.94 1.08 11.98 0 9.24 0 4.28 0 .11 4.04.11 9s4.17 9 9.13 9c2.68 0 4.7-.88 6.28-2.52 1.62-1.62 2.13-3.91 2.13-5.75 0-.57-.04-1.1-.13-1.54H9.24z"/>
                            <path fill="#EA4335" d="M25 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52 0-2.09 1.52-3.52 3.28-3.52s3.28 1.43 3.28 3.52c0 2.07-1.52 3.52-3.28 3.52z"/>
                            <path fill="#FBBC05" d="M53.58 7.49h-.09c-.57-.68-1.67-1.3-3.06-1.3C47.53 6.19 45 8.72 45 12c0 3.26 2.53 5.81 5.43 5.81 1.39 0 2.49-.62 3.06-1.32h.09v.81c0 2.22-1.19 3.41-3.1 3.41-1.56 0-2.53-1.12-2.93-2.07l-2.22.92c.64 1.54 2.33 3.43 5.15 3.43 2.99 0 5.52-1.76 5.52-6.05V6.49h-2.42v1zm-2.93 8.03c-1.76 0-3.1-1.5-3.1-3.52 0-2.05 1.34-3.52 3.1-3.52 1.74 0 3.1 1.5 3.1 3.54 0 2.02-1.37 3.5-3.1 3.5z"/>
                            <path fill="#4285F4" d="M58 .24h2.51v17.57H58z"/>
                            <path fill="#34A853" d="M38.17 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52 0-2.09 1.52-3.52 3.28-3.52s3.28 1.43 3.28 3.52c0 2.07-1.52 3.52-3.28 3.52z"/>
                            <path fill="#EA4335" d="M68.56 6.19c-2.93 0-5.4 2.35-5.4 5.79 0 3.46 2.45 5.82 5.68 5.82 1.73 0 2.65-.69 3.32-1.49v1.19h2.39V6.49h-2.39v1.19c-.67-.8-1.59-1.49-3.32-1.49h-.28zm.31 2.29c1.73 0 3.19 1.45 3.19 3.52 0 2.09-1.46 3.52-3.19 3.52-1.76 0-3.23-1.46-3.23-3.52 0-2.08 1.47-3.52 3.23-3.52z"/>
                        </svg>
                    ` : `
                        <svg class="oauth-sim-logo" viewBox="0 0 36 36" width="36" height="36">
                            <path fill="#1877F2" d="M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18c0 8.99 6.58 16.42 15.19 17.78V23.2h-4.57V18h4.57v-3.96c0-4.51 2.69-7 6.79-7 1.97 0 4.03.35 4.03.35v4.43h-2.27c-2.24 0-2.93 1.39-2.93 2.81V18h4.98l-.8 5.2h-4.18v12.58C29.42 34.42 36 26.99 36 18"/>
                            <path fill="#fff" d="M25 23.2l.8-5.2h-4.98v-3.37c0-1.42.7-2.81 2.93-2.81h2.27V7.39s-2.06-.35-4.03-.35c-4.1 0-6.79 2.49-6.79 7V18h-4.57v5.2h4.57v12.58a18.18 18.18 0 005.62 0V23.2h4.18"/>
                        </svg>
                        <span class="oauth-sim-fb-title">Facebook</span>
                    `}
                </div>
                <div class="oauth-sim-body">
                    <p class="oauth-sim-subtitle">${isGoogle ? 'Choisissez un compte' : 'Se connecter à Facebook'}</p>
                    <p class="oauth-sim-desc">${isGoogle ? 'pour continuer vers TicketMada' : 'Connectez-vous pour accéder à TicketMada'}</p>
                    <div class="oauth-sim-accounts">
                        ${accounts.map((a, i) => `
                            <div class="oauth-sim-account" data-index="${i}">
                                <div class="oauth-sim-avatar" style="background:${a.color}">${a.avatar}</div>
                                <div class="oauth-sim-info">
                                    <div class="oauth-sim-name">${a.name}</div>
                                    <div class="oauth-sim-email">${a.email}</div>
                                </div>
                            </div>
                        `).join('')}
                        <div class="oauth-sim-account oauth-sim-other">
                            <div class="oauth-sim-avatar oauth-sim-avatar-add">+</div>
                            <div class="oauth-sim-info">
                                <div class="oauth-sim-name">Utiliser un autre compte</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="oauth-sim-footer">
                    <span>${isGoogle ? 'Français (France)' : ''}</span>
                    <div>
                        ${isGoogle ? '<a href="#">Aide</a> <a href="#">Confidentialité</a> <a href="#">Conditions</a>' : '<a href="#">Mot de passe oublié ?</a>'}
                    </div>
                </div>
            </div>
        `;

        // Styles
        const style = document.createElement('style');
        style.id = 'oauth-sim-styles';
        style.textContent = `
            .oauth-sim-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99998; animation: oauthFadeIn 0.2s; }
            .oauth-sim-window { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 420px; max-width: 95vw; background: #fff; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 99999; overflow: hidden; animation: oauthSlideIn 0.3s ease; font-family: 'Google Sans', 'Segoe UI', Roboto, Arial, sans-serif; }
            .oauth-sim-window.facebook { border-radius: 8px; }
            .oauth-sim-header { padding: 32px 32px 8px; text-align: center; }
            .oauth-sim-logo { margin: 0 auto; display: block; }
            .oauth-sim-fb-title { font-size: 1.5rem; font-weight: 700; color: #1C1E21; margin-left: 8px; vertical-align: middle; }
            .oauth-sim-body { padding: 8px 32px 16px; }
            .oauth-sim-subtitle { font-size: 1.1rem; font-weight: 500; color: #202124; text-align: center; margin-bottom: 4px; }
            .oauth-sim-desc { font-size: 0.85rem; color: #5f6368; text-align: center; margin-bottom: 20px; }
            .oauth-sim-accounts { border: 1px solid #dadce0; border-radius: 8px; overflow: hidden; }
            .oauth-sim-account { display: flex; align-items: center; gap: 16px; padding: 14px 20px; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid #f0f0f0; }
            .oauth-sim-account:last-child { border-bottom: none; }
            .oauth-sim-account:hover { background: #f6f8fc; }
            .oauth-sim-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 0.9rem; flex-shrink: 0; }
            .oauth-sim-avatar-add { background: #e8eaed !important; color: #5f6368 !important; font-size: 1.4rem; }
            .oauth-sim-info { flex: 1; min-width: 0; }
            .oauth-sim-name { font-size: 0.95rem; font-weight: 500; color: #202124; }
            .oauth-sim-email { font-size: 0.8rem; color: #5f6368; }
            .oauth-sim-footer { padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #5f6368; border-top: 1px solid #f0f0f0; }
            .oauth-sim-footer a { color: #5f6368; text-decoration: none; margin-left: 16px; }
            .oauth-sim-footer a:hover { color: #202124; }
            .oauth-sim-loading { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px 32px; }
            .oauth-sim-spinner { width: 36px; height: 36px; border: 3px solid #e0e0e0; border-top-color: #4285F4; border-radius: 50%; animation: oauthSpin 0.8s linear infinite; }
            .facebook .oauth-sim-spinner { border-top-color: #1877F2; }
            .oauth-sim-loading-text { font-size: 0.9rem; color: #5f6368; }
            @keyframes oauthFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes oauthSlideIn { from { opacity: 0; transform: translate(-50%, -48%); } to { opacity: 1; transform: translate(-50%, -50%); } }
            @keyframes oauthSpin { to { transform: rotate(360deg); } }
        `;

        if (!document.getElementById('oauth-sim-styles')) document.head.appendChild(style);
        document.body.appendChild(overlay);
        this._overlay = overlay;

        // Event handlers
        overlay.querySelector('.oauth-sim-backdrop').addEventListener('click', () => this.close());

        overlay.querySelectorAll('.oauth-sim-account:not(.oauth-sim-other)').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.index);
                const account = accounts[idx];
                this._showLoading(provider, account.name);
                setTimeout(() => {
                    this.close();
                    callback(account.name, account.email);
                }, 1200);
            });
        });

        overlay.querySelector('.oauth-sim-other')?.addEventListener('click', () => {
            // Show a mini form to enter name & email (simulates adding a new account)
            const body = overlay.querySelector('.oauth-sim-body');
            body.innerHTML = `
                <div style="padding: 8px 0;">
                    <p class="oauth-sim-subtitle">${isGoogle ? 'Se connecter avec un autre compte' : 'Connexion avec un autre compte'}</p>
                    <p class="oauth-sim-desc">Entrez vos informations pour continuer</p>
                    <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
                        <input id="oauth-other-name" type="text" placeholder="Nom et prénom" style="padding:12px 16px;border:1px solid #dadce0;border-radius:6px;font-size:0.95rem;font-family:inherit;outline:none;transition:border 0.2s;" onfocus="this.style.borderColor='${isGoogle ? '#4285F4' : '#1877F2'}'" onblur="this.style.borderColor='#dadce0'">
                        <input id="oauth-other-email" type="email" placeholder="adresse@email.com" style="padding:12px 16px;border:1px solid #dadce0;border-radius:6px;font-size:0.95rem;font-family:inherit;outline:none;transition:border 0.2s;" onfocus="this.style.borderColor='${isGoogle ? '#4285F4' : '#1877F2'}'" onblur="this.style.borderColor='#dadce0'">
                        <button id="oauth-other-submit" style="padding:12px 24px;background:${isGoogle ? '#4285F4' : '#1877F2'};color:#fff;border:none;border-radius:6px;font-size:0.95rem;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Continuer</button>
                    </div>
                </div>
            `;
            const submitBtn = overlay.querySelector('#oauth-other-submit');
            const nameInput = overlay.querySelector('#oauth-other-name');
            const emailInput = overlay.querySelector('#oauth-other-email');
            nameInput.focus();
            const doSubmit = () => {
                const name = nameInput.value.trim();
                const email = emailInput.value.trim();
                if (!name) { nameInput.style.borderColor = '#EA4335'; nameInput.placeholder = 'Veuillez entrer votre nom'; return; }
                if (!email || !email.includes('@')) { emailInput.style.borderColor = '#EA4335'; emailInput.placeholder = 'Email invalide'; return; }
                this._showLoading(provider, name);
                setTimeout(() => { this.close(); callback(name, email); }, 1200);
            };
            submitBtn.addEventListener('click', doSubmit);
            emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSubmit(); });
            nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') emailInput.focus(); });
        });

        // Escape key
        const escHandler = (e) => {
            if (e.key === 'Escape') { this.close(); document.removeEventListener('keydown', escHandler); }
        };
        document.addEventListener('keydown', escHandler);
    },

    _showLoading(provider, name) {
        const oauthWin = this._overlay?.querySelector('.oauth-sim-window');
        if (!oauthWin) return;
        const body = oauthWin.querySelector('.oauth-sim-body');
        body.innerHTML = `
            <div class="oauth-sim-loading">
                <div class="oauth-sim-spinner"></div>
                <div class="oauth-sim-loading-text">Connexion en tant que <strong>${name}</strong>...</div>
            </div>
        `;
    },

    close() {
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
    }
};
