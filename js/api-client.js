/**
 * TicketMada API Client
 * Smart client: tries real API first, falls back to rich mock data.
 * Works perfectly on GitHub Pages (no backend) and with a real backend.
 */

const TicketMadaAPI = (() => {

    // =========================================================================
    // MOCK DATA — Rich, realistic Malagasy event data
    // =========================================================================

    const MOCK_EVENTS = [
        {
            id: 1,
            name: "Dama Live — Tournée Nationale 2026",
            artist: "Dama (Mahaleo)",
            description: "Le légendaire Dama revient sur scène pour une tournée historique à travers Madagascar. Un concert exceptionnel mêlant classiques intemporels et nouvelles compositions.",
            emoji: "🎤",
            category: "concerts",
            date_start: "2026-06-15",
            time: "19:00",
            venue: "Stade Barea Mahamasina",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800",
            capacity: 15000,
            tickets_sold: 12500,
            status: "active",
            organizer: "Live Nation Madagascar",
            zones: [
                { id: "pit", name: "Fosse", code: "PIT", color: "#9B59B6", price: 60000, capacity: 500, rows: 4, seatsPerRow: 15 },
                { id: "vip", name: "VIP", code: "VIP", color: "#FF6B4A", price: 150000, capacity: 1000, rows: 5, seatsPerRow: 20 },
                { id: "premium", name: "Premium", code: "PREM", color: "#FECA57", price: 80000, capacity: 2500, rows: 8, seatsPerRow: 25 },
                { id: "standard", name: "Standard", code: "STD", color: "#4A90FF", price: 40000, capacity: 5000, rows: 10, seatsPerRow: 30 },
                { id: "eco", name: "Économique", code: "ECO", color: "#00D9A5", price: 20000, capacity: 6000, rows: 10, seatsPerRow: 35 }
            ]
        },
        {
            id: 2,
            name: "Festival Donia 2026",
            artist: "Artistes Multiples",
            description: "Le plus grand festival de musique de l'Océan Indien revient à Nosy Be ! 3 jours de musique, danse et culture malgache.",
            emoji: "🎪",
            category: "festival",
            date_start: "2026-07-20",
            time: "16:00",
            venue: "Plage Ambatoloaka",
            city: "Nosy Be",
            image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
            capacity: 20000,
            tickets_sold: 14000,
            status: "active",
            organizer: "Donia Events",
            zones: [
                { id: "pit", name: "Fosse", code: "PIT", color: "#9B59B6", price: 80000, capacity: 1000, rows: 5, seatsPerRow: 20 },
                { id: "vip", name: "VIP", code: "VIP", color: "#FF6B4A", price: 200000, capacity: 2000, rows: 6, seatsPerRow: 22 },
                { id: "premium", name: "Premium", code: "PREM", color: "#FECA57", price: 100000, capacity: 4000, rows: 10, seatsPerRow: 28 },
                { id: "standard", name: "Standard", code: "STD", color: "#4A90FF", price: 50000, capacity: 6000, rows: 12, seatsPerRow: 30 },
                { id: "eco", name: "Économique", code: "ECO", color: "#00D9A5", price: 25000, capacity: 7000, rows: 12, seatsPerRow: 35 }
            ]
        },
        {
            id: 3,
            name: "Erick Manana — Acoustic Session",
            artist: "Erick Manana",
            description: "Une soirée acoustique intime avec le maître de la guitare malgache. Répertoire traditionnel revisité.",
            emoji: "🎸",
            category: "concerts",
            date_start: "2026-05-28",
            time: "20:00",
            venue: "Alliance Française",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800",
            capacity: 800,
            tickets_sold: 650,
            status: "active",
            organizer: "AF Tana",
            zones: [
                { id: "vip", name: "VIP", code: "VIP", color: "#FF6B4A", price: 120000, capacity: 100, rows: 3, seatsPerRow: 12 },
                { id: "premium", name: "Premium", code: "PREM", color: "#FECA57", price: 60000, capacity: 200, rows: 5, seatsPerRow: 16 },
                { id: "standard", name: "Standard", code: "STD", color: "#4A90FF", price: 35000, capacity: 300, rows: 6, seatsPerRow: 20 },
                { id: "eco", name: "Économique", code: "ECO", color: "#00D9A5", price: 15000, capacity: 200, rows: 5, seatsPerRow: 18 }
            ]
        },
        {
            id: 4,
            name: "Samoela & Tence Mena — Duo Live",
            artist: "Samoela & Tence Mena",
            description: "Deux voix iconiques de la musique malgache réunies pour un concert unique. Ambiance garantie !",
            emoji: "🎶",
            category: "concerts",
            date_start: "2026-08-05",
            time: "18:30",
            venue: "CCI Ivato",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800",
            capacity: 5000,
            tickets_sold: 3800,
            status: "active",
            organizer: "MadaMusic Production",
            zones: [
                { id: "pit", name: "Fosse", code: "PIT", color: "#9B59B6", price: 50000, capacity: 300, rows: 3, seatsPerRow: 12 },
                { id: "vip", name: "VIP", code: "VIP", color: "#FF6B4A", price: 100000, capacity: 500, rows: 4, seatsPerRow: 18 },
                { id: "premium", name: "Premium", code: "PREM", color: "#FECA57", price: 60000, capacity: 1000, rows: 6, seatsPerRow: 22 },
                { id: "standard", name: "Standard", code: "STD", color: "#4A90FF", price: 30000, capacity: 1500, rows: 8, seatsPerRow: 25 },
                { id: "eco", name: "Économique", code: "ECO", color: "#00D9A5", price: 15000, capacity: 1700, rows: 8, seatsPerRow: 28 }
            ]
        },
        {
            id: 5,
            name: "Stand-Up Comedy Night — Mahery",
            artist: "Mahery",
            description: "Le roi du stand-up malgache dans un one-man-show déjanté. Rires garantis pendant 2h !",
            emoji: "😂",
            category: "humour",
            date_start: "2026-06-01",
            time: "20:00",
            venue: "Théâtre de Verdure",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800",
            capacity: 2000,
            tickets_sold: 1700,
            status: "active",
            organizer: "Haha Production",
            zones: [
                { id: "vip", name: "VIP", code: "VIP", color: "#FF6B4A", price: 80000, capacity: 200, rows: 3, seatsPerRow: 14 },
                { id: "premium", name: "Premium", code: "PREM", color: "#FECA57", price: 50000, capacity: 500, rows: 5, seatsPerRow: 18 },
                { id: "standard", name: "Standard", code: "STD", color: "#4A90FF", price: 25000, capacity: 800, rows: 7, seatsPerRow: 22 },
                { id: "eco", name: "Économique", code: "ECO", color: "#00D9A5", price: 10000, capacity: 500, rows: 5, seatsPerRow: 20 }
            ]
        },
        {
            id: 6,
            name: "Tournoi Basketball — Coupe de Madagascar",
            artist: "Équipes Nationales",
            description: "La grande finale de la Coupe de Madagascar de basketball. Ambiance de folie au palais des sports !",
            emoji: "🏀",
            category: "sports",
            date_start: "2026-09-12",
            time: "15:00",
            venue: "Palais des Sports Mahamasina",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800",
            capacity: 8000,
            tickets_sold: 5500,
            status: "active",
            organizer: "Fédération Malgache de Basketball",
            zones: [
                { id: "vip", name: "VIP Courtside", code: "VIP", color: "#FF6B4A", price: 100000, capacity: 500, rows: 3, seatsPerRow: 16 },
                { id: "premium", name: "Tribune Premium", code: "PREM", color: "#FECA57", price: 50000, capacity: 1500, rows: 6, seatsPerRow: 22 },
                { id: "standard", name: "Tribune Standard", code: "STD", color: "#4A90FF", price: 25000, capacity: 3000, rows: 10, seatsPerRow: 28 },
                { id: "eco", name: "Tribune Populaire", code: "ECO", color: "#00D9A5", price: 10000, capacity: 3000, rows: 10, seatsPerRow: 30 }
            ]
        },
        {
            id: 7,
            name: "Théâtre — Ny Ainga (Le Souffle)",
            artist: "Compagnie Miangaly",
            description: "Pièce de théâtre contemporain en malgache et français. Une œuvre poétique sur l'identité et la diaspora.",
            emoji: "🎭",
            category: "theatre",
            date_start: "2026-05-20",
            time: "19:30",
            venue: "IFM Analakely",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800",
            capacity: 500,
            tickets_sold: 380,
            status: "active",
            organizer: "Compagnie Miangaly",
            zones: [
                { id: "vip", name: "Orchestre", code: "VIP", color: "#FF6B4A", price: 60000, capacity: 80, rows: 3, seatsPerRow: 10 },
                { id: "premium", name: "Balcon", code: "PREM", color: "#FECA57", price: 40000, capacity: 150, rows: 4, seatsPerRow: 14 },
                { id: "standard", name: "Mezzanine", code: "STD", color: "#4A90FF", price: 20000, capacity: 170, rows: 5, seatsPerRow: 16 },
                { id: "eco", name: "Galerie", code: "ECO", color: "#00D9A5", price: 10000, capacity: 100, rows: 4, seatsPerRow: 12 }
            ]
        },
        {
            id: 8,
            name: "DJ Rolly — Beach Party Toamasina",
            artist: "DJ Rolly",
            description: "La plus grande beach party de la côte Est ! Electro, tropical house et hits malgaches au bord de l'océan.",
            emoji: "🏖️",
            category: "festival",
            date_start: "2026-07-14",
            time: "17:00",
            venue: "Plage du Bord",
            city: "Toamasina",
            image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800",
            capacity: 3000,
            tickets_sold: 2100,
            status: "active",
            organizer: "East Coast Events",
            zones: [
                { id: "vip", name: "VIP Lounge", code: "VIP", color: "#FF6B4A", price: 120000, capacity: 200, rows: 3, seatsPerRow: 12 },
                { id: "premium", name: "Front Stage", code: "PREM", color: "#FECA57", price: 60000, capacity: 600, rows: 5, seatsPerRow: 18 },
                { id: "standard", name: "General", code: "STD", color: "#4A90FF", price: 30000, capacity: 1200, rows: 8, seatsPerRow: 24 },
                { id: "eco", name: "Back Beach", code: "ECO", color: "#00D9A5", price: 15000, capacity: 1000, rows: 7, seatsPerRow: 22 }
            ]
        },
        {
            id: 9,
            name: "Conférence TEDx Antananarivo",
            artist: "Speakers Multiples",
            description: "TEDx revient à Tana avec 12 speakers inspirants. Thème : 'Mitsangana — Se relever'. Innovation, culture et vision.",
            emoji: "💡",
            category: "conference",
            date_start: "2026-10-05",
            time: "09:00",
            venue: "Carlton Madagascar",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
            capacity: 1200,
            tickets_sold: 900,
            status: "active",
            organizer: "TEDx Antananarivo",
            zones: [
                { id: "vip", name: "VIP", code: "VIP", color: "#FF6B4A", price: 200000, capacity: 100, rows: 3, seatsPerRow: 12 },
                { id: "premium", name: "Premium", code: "PREM", color: "#FECA57", price: 100000, capacity: 300, rows: 5, seatsPerRow: 18 },
                { id: "standard", name: "Standard", code: "STD", color: "#4A90FF", price: 50000, capacity: 500, rows: 7, seatsPerRow: 22 },
                { id: "eco", name: "Étudiant", code: "ECO", color: "#00D9A5", price: 20000, capacity: 300, rows: 5, seatsPerRow: 18 }
            ]
        },
        {
            id: 10,
            name: "Jaojoby & Régis Gizavo Tribute",
            artist: "Jaojoby",
            description: "Le roi du Salegy rend hommage à Régis Gizavo dans un concert mémorable. Musique traditionnelle et world music.",
            emoji: "🪘",
            category: "concerts",
            date_start: "2026-08-22",
            time: "19:00",
            venue: "Kianja Barea",
            city: "Mahajanga",
            image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
            capacity: 10000,
            tickets_sold: 7800,
            status: "active",
            organizer: "Salegy Production",
            zones: [
                { id: "pit", name: "Fosse", code: "PIT", color: "#9B59B6", price: 50000, capacity: 600, rows: 4, seatsPerRow: 15 },
                { id: "vip", name: "VIP", code: "VIP", color: "#FF6B4A", price: 120000, capacity: 800, rows: 4, seatsPerRow: 18 },
                { id: "premium", name: "Premium", code: "PREM", color: "#FECA57", price: 70000, capacity: 2000, rows: 8, seatsPerRow: 24 },
                { id: "standard", name: "Standard", code: "STD", color: "#4A90FF", price: 35000, capacity: 3000, rows: 10, seatsPerRow: 28 },
                { id: "eco", name: "Économique", code: "ECO", color: "#00D9A5", price: 15000, capacity: 3600, rows: 10, seatsPerRow: 32 }
            ]
        }
    ];

    // Mock artists data
    const MOCK_ARTISTS = [
        { name: "Dama (Mahaleo)", genre: "Folk / Chanson", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200", bio: "Membre fondateur du groupe légendaire Mahaleo, Dama est l'une des figures les plus emblématiques de la musique malgache." },
        { name: "Erick Manana", genre: "Guitare / Traditionnel", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200", bio: "Virtuose de la guitare, Erick Manana fusionne musique traditionnelle malgache et influences internationales." },
        { name: "Samoela", genre: "Pop / Variété", image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=200", bio: "Artiste populaire malgache, connu pour ses hits qui font danser tout Madagascar." },
        { name: "Tence Mena", genre: "Pop / RnB", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200", bio: "La diva de la musique malgache moderne, Tence Mena mêle pop, RnB et rythmes tropicaux." },
        { name: "Jaojoby", genre: "Salegy", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200", bio: "Le roi du Salegy, ambassadeur de la musique malgache à travers le monde." },
        { name: "DJ Rolly", genre: "Electro / Tropical", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200", bio: "DJ et producteur malgache, référence de la scène électro de l'Océan Indien." },
        { name: "Mahery", genre: "Stand-Up / Humour", image: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=200", bio: "Humoriste numéro 1 de Madagascar, Mahery fait rire des millions de fans." }
    ];

    // =========================================================================
    // MOCK API METHODS — Return mock data as if from a real API
    // =========================================================================

    const MockAPI = {
        getEvents(filters = {}) {
            let events = [...MOCK_EVENTS];
            if (filters.city) events = events.filter(e => e.city.toLowerCase() === filters.city.toLowerCase());
            if (filters.category) events = events.filter(e => e.category === filters.category);
            if (filters.search) {
                const q = filters.search.toLowerCase();
                events = events.filter(e =>
                    e.name.toLowerCase().includes(q) ||
                    e.artist.toLowerCase().includes(q) ||
                    e.venue.toLowerCase().includes(q) ||
                    e.city.toLowerCase().includes(q)
                );
            }
            return { events, total: events.length };
        },

        getEvent(id) {
            const event = MOCK_EVENTS.find(e => e.id === parseInt(id));
            if (!event) return { event: MOCK_EVENTS[0] }; // fallback to first event
            return { event };
        },

        getEventSeats(eventId) {
            const event = MOCK_EVENTS.find(e => e.id === parseInt(eventId));
            if (!event) return { zones: [] };
            
            // Generate seat-level data from zone config
            const zones = event.zones.map(zone => {
                const soldRatio = event.tickets_sold / event.capacity;
                const seats = [];
                for (let r = 0; r < zone.rows; r++) {
                    const rowLabel = String.fromCharCode(65 + r); // A, B, C...
                    for (let s = 1; s <= zone.seatsPerRow; s++) {
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
                return { ...zone, seats };
            });

            return { zones };
        },

        searchEvents(query) {
            return this.getEvents({ search: query });
        },

        getArtist(name) {
            const artist = MOCK_ARTISTS.find(a => a.name.toLowerCase().includes(name.toLowerCase()));
            const events = MOCK_EVENTS.filter(e => e.artist.toLowerCase().includes(name.toLowerCase()));
            return { artist: artist || { name, genre: "Artiste", bio: "Artiste malgache." }, events };
        },

        getRelatedEvents(eventId) {
            const event = MOCK_EVENTS.find(e => e.id === parseInt(eventId));
            if (!event) return { events: MOCK_EVENTS.slice(0, 4) };
            // Same category or city, excluding current event
            let related = MOCK_EVENTS.filter(e => e.id !== event.id && (e.category === event.category || e.city === event.city));
            if (related.length === 0) related = MOCK_EVENTS.filter(e => e.id !== event.id).slice(0, 4);
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
                total_events: MOCK_EVENTS.length,
                total_users: 2847,
                total_tickets_sold: MOCK_EVENTS.reduce((s, e) => s + e.tickets_sold, 0),
                total_revenue: MOCK_EVENTS.reduce((s, e) => {
                    const avgPrice = e.zones.reduce((a, z) => a + z.price, 0) / e.zones.length;
                    return s + (e.tickets_sold * avgPrice);
                }, 0),
                commission_earned: 0  // calculated as 3% of revenue
            };
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
        }

        async request(method, path, body = null) {
            const headers = { 'Content-Type': 'application/json' };
            if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
            const opts = { method, headers };
            if (body) opts.body = JSON.stringify(body);
            const res = await fetch(this.baseUrl + path, opts);
            if (!res.ok) throw new Error(`API ${res.status}`);
            return res.json();
        }

        get(path) { return this.request('GET', path); }
        post(path, data) { return this.request('POST', path, data); }
        put(path, data) { return this.request('PUT', path, data); }
        delete(path) { return this.request('DELETE', path); }

        setAuth(token) { this.token = token; localStorage.setItem('ticketmada_token', token); }
        clearAuth() { this.token = null; localStorage.removeItem('ticketmada_token'); }
        isLoggedIn() { return !!this.token; }
    }

    // =========================================================================
    // SMART CLIENT — Tries real API, falls back to mock
    // =========================================================================

    class SmartAPI {
        constructor() {
            this.real = new RealAPI();
            this.useMock = true; // Start with mock, switch if backend responds
            this._checkBackend();
        }

        async _checkBackend() {
            try {
                const res = await fetch((window.TICKETMADA_CONFIG?.API_BASE || '') + '/api/health', {
                    method: 'GET',
                    signal: AbortSignal.timeout(3000)  // 3s timeout
                });
                if (res.ok) {
                    this.useMock = false;
                    console.log('[TicketMada] Backend connected — using real API');
                }
            } catch {
                this.useMock = true;
                console.log('[TicketMada] No backend — using mock data');
            }
        }

        // --- Events ---
        async getEvents(filters) {
            if (this.useMock) return MockAPI.getEvents(filters);
            return this.real.get('/api/events?' + new URLSearchParams(filters));
        }

        async getEvent(id) {
            if (this.useMock) return MockAPI.getEvent(id);
            return this.real.get('/api/events/' + id);
        }

        async getEventSeats(eventId) {
            if (this.useMock) return MockAPI.getEventSeats(eventId);
            return this.real.get('/api/events/' + eventId + '/seats');
        }

        async searchEvents(query) {
            if (this.useMock) return MockAPI.searchEvents(query);
            return this.real.get('/api/search?q=' + encodeURIComponent(query));
        }

        async getArtist(name) {
            if (this.useMock) return MockAPI.getArtist(name);
            return this.real.get('/api/artists/' + encodeURIComponent(name));
        }

        async getRelatedEvents(eventId) {
            if (this.useMock) return MockAPI.getRelatedEvents(eventId);
            return this.real.get('/api/events/' + eventId + '/related');
        }

        // --- Orders ---
        async createOrder(data) {
            if (this.useMock) return MockAPI.createOrder(data);
            return this.real.post('/api/orders', data);
        }

        async getMyTickets(userId) {
            if (this.useMock) return MockAPI.getMyTickets();
            return this.real.get('/api/orders/user/' + userId);
        }

        // --- Alerts ---
        async setPriceAlert(data) {
            if (this.useMock) return MockAPI.setPriceAlert(data);
            return this.real.post('/api/price-alerts', data);
        }

        // --- Admin ---
        async getPlatformStats() {
            if (this.useMock) return MockAPI.getPlatformStats();
            return this.real.get('/api/stats');
        }

        // --- Auth (always use real API for these) ---
        async register(data) { return this.real.post('/api/auth/register', data); }
        async login(data) { return this.real.post('/api/auth/login', data); }
        async oauthLogin(data) { return this.real.post('/api/auth/oauth', data); }

        setAuth(token) { this.real.setAuth(token); }
        clearAuth() { this.real.clearAuth(); }
        isLoggedIn() { return this.real.isLoggedIn(); }

        // Legacy compatibility: direct get/post for pages that call window.api.get()
        async get(path) {
            if (this.useMock) {
                // Route mock responses based on path
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
                return {};
            }
            return this.real.get(path);
        }

        async post(path, data) {
            if (this.useMock) {
                if (path.includes('/orders')) return MockAPI.createOrder(data);
                if (path.includes('/price-alerts')) return MockAPI.setPriceAlert(data);
                return { success: true };
            }
            return this.real.post(path, data);
        }
    }

    return SmartAPI;
})();

// Create global instance
window.api = new TicketMadaAPI();
