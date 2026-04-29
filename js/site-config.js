// TicketMada Site Configuration
// Toggle MODE between 'production' and 'development'
// In production: dev hub hidden, admin pages PIN-protected, unfinished pages redirect
// In development: everything accessible

window.TICKETMADA_CONFIG = {
    // ====== CHANGE THIS TO SWITCH MODES ======
    MODE: 'development',  // 'production' or 'development'
    
    // Admin PIN (change this!)
    ADMIN_PIN: '2026',
    
    // Backend API URL (update when Render is deployed)
    API_BASE: '',  // empty = same origin, set to 'https://ticketmada-api.onrender.com' for production
    
    // Pages config
    pages: {
        // Dev-only pages (hidden in production)
        devOnly: ['index.html'],
        // Admin pages (PIN-protected in production)
        admin: ['ticketmada-dashboard.html', 'ticketmada-superadmin.html'],
        // Unfinished pages (hidden in production)
        unfinished: ['ticketmada-ticketing.html', 'ticketmada-organisateur.html'],
        // Public landing page (redirect target)
        landing: 'ticketmada-landing.html'
    }
};

(function() {
    const cfg = window.TICKETMADA_CONFIG;


    // Set API base URL for api-client.js
    if (cfg.API_BASE) {
        window.API_CONFIG = { baseURL: cfg.API_BASE + '/api' };
    }

    if (cfg.MODE !== 'production') return; // In dev mode, do nothing

    const currentFile = window.location.pathname.split('/').pop() || 'index.html';

    // 1. Dev-only pages → redirect to landing
    if (cfg.pages.devOnly.some(p => currentFile === p || currentFile === '')) {
        const base = window.location.pathname.replace(/[^/]*$/, '');
        window.location.replace(base + 'User/' + cfg.pages.landing);
        return;
    }

    // 2. Unfinished pages → redirect to landing with message
    if (cfg.pages.unfinished.some(p => currentFile.includes(p))) {
        const base = window.location.pathname.replace(/[^/]*$/, '');
        window.location.replace(base + cfg.pages.landing + '?msg=coming_soon');
        return;
    }

    // 3. Admin pages → PIN gate
    if (cfg.pages.admin.some(p => currentFile.includes(p))) {
        const stored = sessionStorage.getItem('tm_admin_pin');
        if (stored === cfg.ADMIN_PIN) return; // Already authenticated this session

        // Build PIN overlay
        document.addEventListener('DOMContentLoaded', function() {
            const overlay = document.createElement('div');
            overlay.id = 'admin-pin-gate';
            overlay.innerHTML = `
                <div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;">
                    <div style="background:#FAF7F2;border:3px solid #1a1a1a;box-shadow:8px 8px 0 #1a1a1a;padding:40px;text-align:center;max-width:360px;width:90%;">
                        <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:1.3rem;margin-bottom:6px;">🔒 Zone Admin</div>
                        <div style="color:#666;font-size:0.85rem;margin-bottom:20px;">Entrez le code PIN pour accéder à cette page</div>
                        <input id="tm-pin-input" type="password" maxlength="10" placeholder="Code PIN"
                            style="width:100%;padding:12px;border:3px solid #1a1a1a;font-size:1.1rem;text-align:center;font-family:'JetBrains Mono',monospace;letter-spacing:6px;margin-bottom:12px;outline:none;">
                        <button id="tm-pin-btn"
                            style="width:100%;padding:12px;background:#FF6B4A;color:white;border:3px solid #1a1a1a;box-shadow:4px 4px 0 #1a1a1a;font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;cursor:pointer;">
                            Accéder
                        </button>
                        <div id="tm-pin-error" style="color:#e74c3c;font-size:0.8rem;margin-top:10px;display:none;">Code incorrect</div>
                        <a href="javascript:history.back()" style="display:block;margin-top:16px;color:#666;font-size:0.8rem;">← Retour</a>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            // Hide page content
            document.querySelectorAll('body > *:not(#admin-pin-gate)').forEach(el => el.style.display = 'none');

            const input = document.getElementById('tm-pin-input');
            const btn = document.getElementById('tm-pin-btn');
            const err = document.getElementById('tm-pin-error');

            function tryPin() {
                if (input.value === cfg.ADMIN_PIN) {
                    sessionStorage.setItem('tm_admin_pin', cfg.ADMIN_PIN);
                    overlay.remove();
                    document.querySelectorAll('body > *').forEach(el => el.style.display = '');
                } else {
                    err.style.display = 'block';
                    input.value = '';
                    input.focus();
                    btn.style.background = '#e74c3c';
                    setTimeout(() => btn.style.background = '#FF6B4A', 600);
                }
            }

            btn.addEventListener('click', tryPin);
            input.addEventListener('keydown', e => { if (e.key === 'Enter') tryPin(); });
            input.focus();
        });
    }
})();
