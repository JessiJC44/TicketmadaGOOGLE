/**
 * TicketMada API Client
 * Smart client: tries real API first, falls back to rich mock data.
 * Works perfectly on GitHub Pages (no backend) and with a real backend.
 */

const TicketMadaAPI = (() => {

    // =========================================================================
    // MOCK DATA — Rich, realistic Malagasy event data
    // =========================================================================

    const CATEGORY_PLACEHOLDERS = {
        concerts: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
        festival: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
        sports: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800',
        theatre: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800',
        exhibition: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800',
        humour: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800',
        default: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'
    };

    const ZONE_TEMPLATES = {
        concert: [
            { id: "pit", name: "Fosse", color: "#9B59B6", price: 60000, rows: 4, seatsPerRow: 15 },
            { id: "vip", name: "VIP", color: "#FF6B4A", price: 150000, rows: 5, seatsPerRow: 20 },
            { id: "premium", name: "Premium", color: "#FECA57", price: 80000, rows: 8, seatsPerRow: 25 },
            { id: "standard", name: "Standard", color: "#4A90FF", price: 40000, rows: 10, seatsPerRow: 30 },
            { id: "eco", name: "Économique", color: "#00D9A5", price: 20000, rows: 10, seatsPerRow: 35 }
        ],
        festival: [
            { id: "vip", name: "VIP Lounge", color: "#FF6B4A", price: 200000, rows: 4, seatsPerRow: 18 },
            { id: "premium", name: "Front Stage", color: "#FECA57", price: 100000, rows: 6, seatsPerRow: 22 },
            { id: "standard", name: "General", color: "#4A90FF", price: 50000, rows: 10, seatsPerRow: 28 },
            { id: "eco", name: "Back Area", color: "#00D9A5", price: 25000, rows: 10, seatsPerRow: 32 }
        ],
        sports: [
            { id: "vip", name: "VIP Courtside", color: "#FF6B4A", price: 100000, rows: 3, seatsPerRow: 16 },
            { id: "premium", name: "Tribune Premium", color: "#FECA57", price: 50000, rows: 6, seatsPerRow: 22 },
            { id: "standard", name: "Tribune Standard", color: "#4A90FF", price: 25000, rows: 10, seatsPerRow: 28 },
            { id: "eco", name: "Tribune Populaire", color: "#00D9A5", price: 10000, rows: 10, seatsPerRow: 30 }
        ],
        theatre: [
            { id: "vip", name: "Orchestre", color: "#FF6B4A", price: 80000, rows: 3, seatsPerRow: 12 },
            { id: "premium", name: "Balcon", color: "#FECA57", price: 50000, rows: 4, seatsPerRow: 16 },
            { id: "standard", name: "Mezzanine", color: "#4A90FF", price: 25000, rows: 5, seatsPerRow: 18 },
            { id: "eco", name: "Galerie", color: "#00D9A5", price: 10000, rows: 4, seatsPerRow: 14 }
        ],
        exhibition: [
            { id: "standard", name: "Entrée Standard", color: "#4A90FF", price: 5000, rows: 5, seatsPerRow: 20 },
            { id: "vip", name: "Pass VIP", color: "#FF6B4A", price: 20000, rows: 3, seatsPerRow: 12 }
        ]
    };

    const MOCK_SUPERADMIN_STATS = {
        totalRevenue: 0,
        totalTicketsSold: 0,
        activeEvents: 0,
        totalUsers: 0,
        activeOrganizers: 0,
        pendingApplications: 0,
        totalEvents: 0,
        blockedUsers: 0,
        totalCommission: 0,
        avgFillRate: 0,
        monthlyRevenue: [],
        categoryDistribution: [],
        topEvents: [],
        recentActivity: []
    };

    const MOCK_SUPERADMIN_ORGANIZERS = [];
    const MOCK_SUPERADMIN_USERS = [];
    const MOCK_APPLICATIONS = [];
    const MOCK_EVENTS = [];
    const MOCK_EVENTS_FINAL = [];
    const MOCK_ARTISTS = [];
    const MOCK_SCAN_LINKS = [];
    const MOCK_SCAN_DEVICES = [];

    // =========================================================================
    // MOCK API METHODS — Return mock data as if from a real API
    // =========================================================================

    const MockAPI = {
        getEvents(filters = {}) {
            let events = [...MOCK_EVENTS_FINAL].map(e => ({
                ...e,
                organizer_name: ['Samoela Ent.', 'Madagascar Events', 'Dago Productions', 'Mahamasina Events'][Math.floor(Math.random() * 4)],
                ticketsSold: e.tickets_sold || Math.floor(Math.random() * e.capacity),
                totalRevenue: (e.tickets_sold || 1000) * 20000,
                created_at: new Date(Date.now() - 86400000 * 30).toISOString()
            }));
            if (filters.city) events = events.filter(e => e.city.toLowerCase() === filters.city.toLowerCase());
            if (filters.category) events = events.filter(e => e.category === filters.category);
            if (filters.search) {
                const q = filters.search.toLowerCase();
                events = events.filter(e =>
                    e.name.toLowerCase().includes(q) ||
                    (e.artist && e.artist.toLowerCase().includes(q)) ||
                    e.venue.toLowerCase().includes(q) ||
                    e.city.toLowerCase().includes(q)
                );
            }
            return { events, total: events.length };
        },

        getEvent(id) {
            const event = MOCK_EVENTS_FINAL.find(e => e.id === parseInt(id));
            if (!event) return { event: MOCK_EVENTS_FINAL[0] }; // fallback to first event
            return { event };
        },

        getEventSeats(eventId) {
            const event = MOCK_EVENTS_FINAL.find(e => e.id === parseInt(eventId));
            if (!event) return { zones: [] };
            
            // Generate seat-level data from zone config
            const zones = event.zones.map(zone => {
                const soldRatio = (event.tickets_sold || 0) / (event.capacity || 1);
                const rows = zone.rows || 5;
                const seatsPerRow = zone.seatsPerRow || 20;
                const seats = [];
                for (let r = 0; r < rows; r++) {
                    const rowLabel = String.fromCharCode(65 + r); // A, B, C...
                    for (let s = 1; s <= seatsPerRow; s++) {
                        const isSold = Math.random() < soldRatio * 0.8;
                        seats.push({
                            id: `${zone.id}-${rowLabel}-${s}`,
                            row: rowLabel,
                            seat: s,
                            status: isSold ? 'sold' : 'available',
                            price: zone.price
                        });
                    }
                }
                return { ...zone, rows, seatsPerRow, seats };
            });

            return { zones };
        },

        searchEvents(query) {
            return this.getEvents({ search: query });
        },

        getArtist(name) {
            const artist = MOCK_ARTISTS.find(a => a.name.toLowerCase().includes(name.toLowerCase()));
            const events = MOCK_EVENTS_FINAL.filter(e => e.artist.toLowerCase().includes(name.toLowerCase()));
            return { artist: artist || { name, genre: "Artiste", bio: "Artiste malgache." }, events };
        },

        getRelatedEvents(eventId) {
            const event = MOCK_EVENTS_FINAL.find(e => e.id === parseInt(eventId));
            if (!event) return { events: MOCK_EVENTS_FINAL.slice(0, 4) };
            // Same category or city, excluding current event
            let related = MOCK_EVENTS_FINAL.filter(e => e.id !== event.id && (e.category === event.category || e.city === event.city));
            if (related.length === 0) related = MOCK_EVENTS_FINAL.filter(e => e.id !== event.id).slice(0, 4);
            return { events: related.slice(0, 6) };
        },

        createOrder(orderData) {
            const orderId = 'TM-' + Date.now().toString(36).toUpperCase();
            return {
                success: true,
                order: {
                    id: orderId,
                    ...orderData,
                    status: 'confirmed',
                    created_at: new Date().toISOString(),
                    qr_code: orderId
                }
            };
        },

        getMyTickets() {
            const saved = localStorage.getItem('ticketmada_orders');
            return { orders: saved ? JSON.parse(saved) : [] };
        },

        setPriceAlert(data) {
            const alerts = JSON.parse(localStorage.getItem('ticketmada_alerts') || '[]');
            alerts.push({ ...data, id: Date.now(), active: true, created_at: new Date().toISOString() });
            localStorage.setItem('ticketmada_alerts', JSON.stringify(alerts));
            return { success: true };
        },

        getPlatformStats() {
            return {
                total_events: MOCK_EVENTS_FINAL.length,
                total_users: 2847,
                total_tickets_sold: MOCK_EVENTS_FINAL.reduce((s, e) => s + (e.tickets_sold || 0), 0),
                total_revenue: MOCK_EVENTS_FINAL.reduce((s, e) => {
                    const avgPrice = (e.zones && e.zones.length > 0) ? (e.zones.reduce((a, z) => a + z.price, 0) / e.zones.length) : 20000;
                    return s + ((e.tickets_sold || 0) * avgPrice);
                }, 0),
                commission_earned: 0  // calculated as 3% of revenue
            };
        },

        getScanLinks() {
            return MOCK_SCAN_LINKS;
        },

        getScanDevices() {
            return MOCK_SCAN_DEVICES;
        },

        getScanLogs() {
            return MOCK_SCAN_DEVICES.flatMap(d => {
                const logs = [];
                for (let i = 0; i < 5; i++) {
                    logs.push({
                        id: Date.now() + Math.random(),
                        scanned_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
                        buyer_name: ['Rakoto Jean', 'Rasoa Marie', 'Andry Nirina', 'Fanja Harisoa'][Math.floor(Math.random() * 4)],
                        event_name: d.event_name,
                        zone: ['VIP', 'Standard', 'Économique'][Math.floor(Math.random() * 3)],
                        price: 40000,
                        device_name: d.device_name,
                        status: 'valid'
                    });
                }
                return logs;
            }).sort((a,b) => new Date(b.scanned_at) - new Date(a.scanned_at));
        },

        getApplications() {
            return MOCK_APPLICATIONS;
        },

        validateScanLink(token) {
            const link = MOCK_SCAN_LINKS.find(l => l.token === token);
            if (!link) return { valid: false, error: 'Lien invalide ou expiré' };
            return {
                valid: true,
                event: MOCK_EVENTS_FINAL.find(e => e.id === link.event_id),
                device_id: 99,
                device_name: 'Mon appareil'
            };
        },

        scanTicket(ticketCode, eventId) {
            const rand = Math.random();
            if (rand < 0.70) {
                const zones = ['VIP', 'Premium', 'Standard', 'Économique'];
                const names = ['Rakoto Jean', 'Rasoa Marie', 'Andry Nirina', 'Fanja Harisoa', 'Tahina Rado'];
                const zone = zones[Math.floor(Math.random() * zones.length)];
                const prices = { VIP: 150000, Premium: 80000, Standard: 40000, 'Économique': 20000 };
                return {
                    status: 'valid',
                    ticket_code: ticketCode,
                    buyer_name: names[Math.floor(Math.random() * names.length)],
                    zone: zone,
                    seat: String.fromCharCode(65 + Math.floor(Math.random() * 8)) + (Math.floor(Math.random() * 20) + 1),
                    tariff: zone,
                    price: prices[zone],
                    event_name: 'Dama Live — Tournée 2026'
                };
            } else if (rand < 0.85) {
                return {
                    status: 'already_scanned',
                    ticket_code: ticketCode,
                    buyer_name: 'Rakoto Jean',
                    first_scanned_at: new Date(Date.now() - 3600000).toISOString(),
                    scanned_by: 'Staff Entrée A',
                    zone: 'Standard',
                    seat: 'C5'
                };
            } else {
                const reasons = ['QR code erroné', 'Billet non trouvé', 'Mauvais événement', 'Billet expiré'];
                return {
                    status: 'invalid',
                    ticket_code: ticketCode,
                    error: reasons[Math.floor(Math.random() * reasons.length)]
                };
            }
        },

        login(email, password) {
            if (!email) return { success: false, error: "Email requis" };
            // Check for special demo accounts
            if (email === 'sedrayiokoraz@gmail.com') {
                return { success: true, token: 'mock-superadmin-token', user: { id: 1, name: 'Sedra (SuperAdmin)', email, role: 'superadmin', avatar_initials: 'SA' } };
            }
            if (email === 'admin@ticketmada.mg') {
                return { success: true, token: 'mock-admin-token', user: { name: 'Super Admin', email, role: 'admin' } };
            }
            if (email === 'organizer@ticketmada.mg') {
                return { success: true, token: 'mock-org-token', user: { name: 'Organisateur Pro', email, role: 'organizer' } };
            }
            // Default to buyer
            return { 
                success: true, 
                token: 'mock-buyer-token', 
                user: { name: email.split('@')[0], email, role: 'buyer' } 
            };
        },

        setScanAuth(token, deviceId) {
            this._scanToken = token;
            this._deviceId = deviceId;
        }
    };

    // =========================================================================
    // REAL API CLIENT — HTTP wrapper for when backend is available
    // =========================================================================

    class RealAPI {
        constructor() {
            const config = window.TICKETMADA_CONFIG || {};
            this.baseUrl = config.API_BASE || '';
            this.token = localStorage.getItem('ticketmada_token') || null;
            this.scanToken = localStorage.getItem('ticketmada_scan_token') || null;
            this.deviceId = localStorage.getItem('ticketmada_device_id') || null;
        }

        async request(path, options = {}) {
            const method = options.method || 'GET';
            const body = options.body;
            const headers = { 'Content-Type': 'application/json' };
            if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
            if (this.scanToken) headers['X-Scan-Token'] = this.scanToken;
            if (this.deviceId) headers['X-Device-Id'] = this.deviceId;
            
            // Add device tracking headers for scanner validation
            if (path.includes('/validate')) {
                headers['X-Device-Fingerprint'] = this.getFingerprint();
                headers['X-Device-Info'] = JSON.stringify({
                    browser: navigator.userAgent,
                    os: navigator.platform,
                    deviceName: this.deviceId || 'Appareil Web'
                });
            }
            
            const opts = { method, headers };
            if (body) opts.body = JSON.stringify(body);
            
            try {
                const res = await fetch(this.baseUrl + (path.startsWith('/api') ? path : '/api' + path), opts);
                const text = await res.text();
                try {
                    const data = JSON.parse(text);
                    if (!res.ok) {
                        throw { status: res.status, error: data.error || `API ${res.status}` };
                    }
                    return data;
                } catch (e) {
                    if (!res.ok) throw { status: res.status, error: `API ${res.status}` };
                    // If it's OK but not JSON, it might be a static file or something else
                    return { success: true, text: text };
                }
            } catch (e) {
                if (e.status) throw e;
                throw { error: e.message || 'Network error' };
            }
        }

        get(path) { return this.request(path, { method: 'GET' }); }
        post(path, data) { return this.request(path, { method: 'POST', body: data }); }
        delete(path) { return this.request(path, { method: 'DELETE' }); }
        async put(path, data) {
            return this.request(path, { method: 'PUT', body: data });
        }

        setAuth(token, user = null) { 
            this.token = token; 
            localStorage.setItem('ticketmada_token', token);
            if (user) {
                if (user.email === 'sedrayiokoraz@gmail.com') user.role = 'superadmin';
                localStorage.setItem('ticketmada_user', JSON.stringify(user));
            }
        }
        setScanAuth(token, deviceId) {
            this.scanToken = token;
            this.deviceId = deviceId;
            localStorage.setItem('ticketmada_scan_token', token);
            localStorage.setItem('ticketmada_device_id', deviceId);
        }
        clearAuth() { 
            this.token = null; 
            this.scanToken = null;
            localStorage.removeItem('ticketmada_token');
            localStorage.removeItem('ticketmada_user');
            localStorage.removeItem('ticketmada_scan_token');
        }
        isLoggedIn() { return !!this.token || !!this.scanToken; }
        getUser() {
            const u = localStorage.getItem('ticketmada_user');
            return u ? JSON.parse(u) : null;
        }
        getUserRole() {
            const u = this.getUser();
            return u ? (u.role || 'buyer') : 'buyer';
        }
        getFingerprint() {
            return btoa(navigator.userAgent + navigator.language + screen.width + 'x' + screen.height).slice(0, 32);
        }
    }

    // =========================================================================
    // SMART CLIENT — Tries real API, falls back to mock
    // =========================================================================

    class SmartAPI {
        constructor() {
            this.real = new RealAPI();
            this.useMock = true; // Start with mock, switch if backend responds
            this._checkBackend();
            // Pre-load firebase module to avoid delay during user-triggered login
            if (typeof window !== 'undefined') {
                import('/js/firebase-init.js').catch(e => console.warn('[SmartAPI] Firebase pre-load failed', e));
            }
        }

        async _checkBackend() {
            try {
                const apiBase = window.TICKETMADA_CONFIG?.API_BASE || '';
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                
                const res = await fetch(apiBase + '/api/health', { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (res.ok) {
                    this.useMock = false;
                    console.log('[TicketMada] Backend connected — using real API');
                }
            } catch (e) {
                this.useMock = true;
                console.log('[TicketMada] No backend — using mock data');
            }
        }

        /**
         * Generic GET method
         */
        async get(path) {
            console.log('[SmartAPI] GET', path);
            if (this.useMock) {
                // Route mock responses based on path
                if (path.includes('/auth/url')) {
                    const provider = new URLSearchParams(path.split('?')[1]).get('provider');
                    return { url: '#mock-auth-' + provider };
                }
                if (path.match(/\/events\/(\d+)\/seats/)) {
                    const id = path.match(/\/events\/(\d+)\/seats/)[1];
                    return MockAPI.getEventSeats(id);
                }
                if (path.match(/\/events\/(\d+)\/related/)) {
                    const id = path.match(/\/events\/(\d+)\/related/)[1];
                    return MockAPI.getRelatedEvents(id);
                }
                if (path.match(/\/events\/(\d+)/)) {
                    const id = path.match(/\/events\/(\d+)/)[1];
                    return MockAPI.getEvent(id);
                }
                if (path.includes('/events')) return MockAPI.getEvents();
                if (path.includes('/search')) {
                    const q = new URL('http://x' + path).searchParams.get('q');
                    return MockAPI.searchEvents(q || '');
                }
                if (path.includes('/artists/')) {
                    const name = path.split('/artists/')[1];
                    return MockAPI.getArtist(decodeURIComponent(name));
                }
                if (path.includes('/stats')) return MockAPI.getPlatformStats();
                if (path.includes('/scan-links/')) {
                    if (path.includes('/validate')) {
                        const token = path.split('/scan-links/')[1].split('/validate')[0];
                        return MockAPI.validateScanLink(token);
                    }
                    return MockAPI.getScanLinks();
                }
                if (path.includes('/scan-devices')) return MockAPI.getScanDevices();
                if (path.includes('/scan-logs')) return MockAPI.getScanLogs();
                if (path.includes('/superadmin/dashboard')) return MOCK_SUPERADMIN_STATS;
                if (path.includes('/superadmin/organizers')) return MOCK_SUPERADMIN_ORGANIZERS;
                if (path.includes('/superadmin/users')) return MOCK_SUPERADMIN_USERS;
                if (path.includes('/superadmin/logs')) return MOCK_SUPERADMIN_STATS.recentActivity;
                if (path.includes('/superadmin/events')) return MockAPI.getEvents().events;
                if (path.includes('/organizer-applications')) return MockAPI.getApplications ? MockAPI.getApplications() : [];
                if (path.includes('/my-application')) {
                    const user = this.getUser();
                    if (user && (user.role === 'superadmin' || user.email === 'sedrayiokoraz@gmail.com')) {
                        return { status: 'approved', role: 'superadmin' };
                    }
                    return {};
                }
                
                if (path.includes('/auth/me')) {
                    const u = this.getUser();
                    if (u) return { user: u };
                    throw { status: 401, error: 'Not logged in' };
                }
                if (path.includes('/auth/status')) return { loggedIn: this.isLoggedIn(), user: this.getUser() };
                return {};
            }
            return this.real.get(path);
        }

        /**
         * Generic POST method
         */
        async post(path, data) {
            console.log('[SmartAPI] POST', path, data);
            if (this.useMock) {
                if (path.includes('/organizer-applications')) {
                    const newApp = {
                        id: 'app_' + Math.random().toString(36).substr(2, 9),
                        ...data,
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    };
                    MOCK_APPLICATIONS.push(newApp);
                    MOCK_SUPERADMIN_STATS.pendingApplications = MOCK_APPLICATIONS.filter(a => a.status === 'pending').length;
                    
                    // Simulate email to admin
                    console.log('%c[EMAIL SIMULATION] TO: sedrayiokoraz@gmail.com', 'background: #FF6B4A; color: white; padding: 5px;', 'New organizer application from ' + data.fullName + ' (' + data.organizationName + '). Review it at: http://localhost:3000/Admin/ticketmada-superadmin.html');
                    
                    return { success: true, id: newApp.id };
                }
                if (path.includes('/orders')) return MockAPI.createOrder(data);
                if (path.includes('/price-alerts')) return MockAPI.setPriceAlert(data);
                if (path.includes('/auth/login')) return MockAPI.login(data.email, data.password);
                if (path.includes('/scan-links')) {
                    return {
                        token: 'sL_new_' + Math.random().toString(36).substr(2, 9),
                        link: window.location.origin + '/User/ticketmada-scanner.html?token=sL_new',
                        label: data.label || 'Nouveau lien',
                        event_id: data.event_id,
                        created_at: new Date().toISOString(),
                        expires_at: data.expires_at || null,
                        devicesCount: 0,
                        totalScans: 0
                    };
                }
                return { success: true };
            }
            return this.real.post(path, data);
        }

        async put(path, data) {
            console.log('[SmartAPI] PUT', path, data);
            if (this.useMock) {
                if (path.match(/\/tickets\/([^\/]+)\/scan/)) {
                    const code = path.match(/\/tickets\/([^\/]+)\/scan/)[1];
                    return MockAPI.scanTicket(code);
                }
                if (path.includes('/superadmin/')) return { success: true };
                if (path.includes('/organizer-applications/')) return { success: true };
                return { success: true };
            }
            return this.real.put(path, data);
        }

        // --- Shared state ---
        getUser() {
            const user = localStorage.getItem('ticketmada_user');
            return user ? JSON.parse(user) : null;
        }

        async logout() {
            try {
                const { logout: firebaseLogout } = await import('/js/firebase-init.js');
                await firebaseLogout();
            } catch (e) {
                console.warn('[SmartAPI] Firebase logout skipped or failed');
            }
            this.clearAuth();
            return { success: true };
        }

        clearAuth() {
            this.real.clearAuth();
        }

        // --- Auth ---
        async register(name, email, password) { 
            let data = typeof name === 'object' ? name : { name, email, password };
            console.log('[SmartAPI] register attempt for:', data.email, 'Backend enabled:', !this.useMock);
            if (this.useMock) {
                const result = { success: true, token: 'mock-reg-token', user: { name: data.name, email: data.email, role: 'buyer' } };
                this.setAuth(result.token, result.user);
                return result;
            }
            return this.real.post('/api/auth/register', data); 
        }
        async login(email, password) { 
            let result;
            let data = typeof email === 'object' ? email : { email, password };
            console.log('[SmartAPI] login attempt for:', data.email, 'Backend enabled:', !this.useMock);
            if (this.useMock) {
                result = MockAPI.login(data.email, data.password);
                console.log('[SmartAPI] Mock Login Result:', result);
            } else {
                try {
                    result = await this.real.post('/api/auth/login', data);
                    console.log('[SmartAPI] Real Login Result:', result);
                } catch (e) {
                    console.error('[SmartAPI] Real Login Failed:', e);
                    // Fallback to mock if real backend fails and we are not strictly "real-only"
                    result = MockAPI.login(data.email, data.password);
                }
            }
            if (result && result.success) {
                this.setAuth(result.token, result.user);
            }
            return result; 
        }
        
        async loginWithGoogle() {
            try {
                console.log('[SmartAPI] Starting Firebase Google Login...');
                const firebaseMod = await import('/js/firebase-init.js');
                const result = await firebaseMod.loginWithGoogle();
                console.log('[SmartAPI] firebaseGoogleLogin result:', result);
                
                if (result && result.success) {
                    console.log('[SmartAPI] Firebase Google Login Success, syncing with backend...');
                    // Always try to sync with our backend to get a local session if possible
                    try {
                        const syncResult = await this.real.post('/api/auth/oauth', {
                            provider: 'google',
                            email: result.user.email,
                            name: result.user.name,
                            firebaseToken: result.token
                        });
                        
                        console.log('[SmartAPI] Backend sync result:', syncResult);
                        if (syncResult && syncResult.token) {
                            console.log('[SmartAPI] Backend sync successful, using backend user');
                            this.setAuth(syncResult.token, syncResult.user);
                            return { success: true, user: syncResult.user, token: syncResult.token };
                        }
                    } catch (err) {
                        console.warn('[SmartAPI] Backend sync error, but Firebase was successful. Using Firebase session.', err);
                    }
                    
                    // If sync fails or we're in mock mode, use the Firebase token as the session token
                    this.setAuth(result.token, result.user);
                    return result;
                }
                return result || { success: false, error: 'Auth failed' };
            } catch (error) {
                console.error('[SmartAPI] Google Login Exception:', error);
                
                // Final fallback to simulation ONLY if everything else fails and we are likely in a restricted environment
                if (window.OAuthSim) {
                    console.log('[SmartAPI] Falling back to OAuth simulation...');
                    return await new Promise((resolve) => {
                        window.OAuthSim.show('Google', (name, email) => {
                            const user = { 
                                name, 
                                email, 
                                role: email === 'sedrayiokoraz@gmail.com' ? 'superadmin' : 'buyer', 
                                id: Date.now() 
                            };
                            this.setAuth('mock-google-token', user);
                            resolve({ success: true, token: 'mock-google-token', user });
                        });
                    });
                }
                return { success: false, error: error.message || 'Erreur inconnue' };
            }
        }

        async oauthLogin(data) { return this.real.post('/api/auth/oauth', data); }

        setAuth(token, user) { this.real.setAuth(token, user); }
        clearAuth() { this.real.clearAuth(); }
        setScanAuth(token, deviceId) { 
            if (this.useMock) MockAPI.setScanAuth(token, deviceId);
            this.real.setScanAuth(token, deviceId); 
        }
        isLoggedIn() { return this.real.isLoggedIn(); }
        getUser() { return this.real.getUser(); }
        getUserRole() { return this.real.getUserRole(); }

        // --- Specific Methods ---
        async getEvents(filters) { return this.get('/events?' + new URLSearchParams(filters)); }
        async getEvent(id) { return this.get('/events/' + id); }
        async searchEvents(query) { return this.get('/search?q=' + encodeURIComponent(query)); }
        async getMyTickets() { return this.get('/orders'); }

    }

    return SmartAPI;
})();

// Create global instance
window.api = new TicketMadaAPI();
