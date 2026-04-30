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
            hot: true,
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
            description: "Le plus grand festival de msuique de l'Océan Indien revient à Nosy Be ! 3 jours de musique, danse et culture malgache.",
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
            hot: true,
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
            hot: true,
            zones: [
                { id: "pit", name: "Fosse", code: "PIT", color: "#9B59B6", price: 50000, capacity: 300, rows: 3, seatsPerRow: 12 },
                { id: "vip", name: "VIP", code: "VIP", color: "#FF6B4A", price: 100000, capacity: 500, rows: 4, seatsPerRow: 18 },
                { id: "premium", name: "Premium", code: "PREM", color: "#FECA57", price: 60000, capacity: 1000, rows: 6, seatsPerRow: 22 },
                { id: "standard", name: "Standard", code: "STD", color: "#4A90FF", price: 30000, capacity: 1500, rows: 8, seatsPerRow: 25 },
                { id: "eco", name: "Économique", code: "ECO", color: "#00D9A5", price: 15000, capacity: 1700, rows: 8, seatsPerRow: 28 }
            ]
        },
        {
            id: 11,
            name: "Bodo — 35 Ans de Scène",
            artist: "Bodo",
            description: "La diva de Madagascar fête ses 35 ans de carrière avec un spectacle grandiose à Mahamasina. Une soirée inoubliable avec tous ses plus grands succès.",
            emoji: "👗",
            category: "concerts",
            date_start: "2026-05-10",
            time: "15:00",
            venue: "Palais des Sports",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800",
            capacity: 6000,
            tickets_sold: 4500,
            status: "active",
            organizer: "Bodo Prods",
            hot: true,
            zones: [
                { id: "vip", name: "VIP Platinum", code: "VIP", color: "#FF6B4A", price: 150000, capacity: 200, rows: 3, seatsPerRow: 15 },
                { id: "premium", name: "Loge Premium", code: "PREM", color: "#FECA57", price: 80000, capacity: 800, rows: 6, seatsPerRow: 20 },
                { id: "standard", name: "Tribune Standard", code: "STD", color: "#4A90FF", price: 40000, capacity: 2000, rows: 10, seatsPerRow: 25 },
                { id: "eco", name: "Tribune Populaire", code: "ECO", color: "#00D9A5", price: 15000, capacity: 3000, rows: 12, seatsPerRow: 30 }
            ]
        },
        {
            id: 12,
            name: "AmbondronA — Rock 2026",
            artist: "AmbondronA",
            description: "Le groupe de rock numéro 1 de Madagascar revient avec un nouveau show spectaculaire. Préparez-vous à vibrer !",
            emoji: "🤘",
            category: "concerts",
            date_start: "2026-09-05",
            time: "18:00",
            venue: "Coliseum Antsonjombe",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800",
            capacity: 50000,
            tickets_sold: 35000,
            status: "active",
            organizer: "Rock Prod",
            hot: true,
            zones: [
                { id: "pit", name: "Fosse Fan", code: "PIT", color: "#9B59B6", price: 50000, capacity: 5000, rows: 15, seatsPerRow: 50 },
                { id: "standard", name: "Tribune", code: "STD", color: "#4A90FF", price: 20000, capacity: 25000, rows: 30, seatsPerRow: 100 },
                { id: "eco", name: "Pelouse", code: "ECO", color: "#00D9A5", price: 10000, capacity: 20000, rows: 20, seatsPerRow: 120 }
            ]
        },
        {
            id: 13,
            name: "Rim-Ka @ Palais des Sports",
            artist: "Rim-Ka",
            description: "La sensation du rap gasy en concert exceptionnel. Une énergie brute et des textes qui parlent à la jeunesse.",
            emoji: "🧢",
            category: "concerts",
            date_start: "2026-06-25",
            time: "19:00",
            venue: "Palais des Sports",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
            capacity: 6500,
            tickets_sold: 5800,
            status: "active",
            organizer: "Gasy Pop",
            hot: true,
            zones: [
                { id: "pit", name: "Mosh Pit", code: "PIT", color: "#9B59B6", price: 40000, capacity: 1000, rows: 10, seatsPerRow: 20 },
                { id: "standard", name: "Gradins", code: "STD", color: "#4A90FF", price: 20000, capacity: 3500, rows: 15, seatsPerRow: 35 },
                { id: "eco", name: "Populaire", code: "ECO", color: "#00D9A5", price: 10000, capacity: 2000, rows: 12, seatsPerRow: 30 }
            ]
        },
        {
            id: 14,
            name: "Mage 4 — Metal Symphonique",
            artist: "Mage 4",
            description: "Les pionniers du metal malgache dans un spectacle fusionnant rock et orchestre symphonique. Une première à Madagascar.",
            emoji: "🎻",
            category: "concerts",
            date_start: "2026-11-15",
            time: "19:30",
            venue: "Palais des Sports",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1514320298324-41d40810167d?w=800",
            capacity: 6000,
            tickets_sold: 3200,
            status: "active",
            organizer: "MetalMada",
            zones: [
                { id: "vip", name: "VIP Loge", code: "VIP", color: "#FF6B4A", price: 100000, capacity: 300, rows: 4, seatsPerRow: 12 },
                { id: "premium", name: "Tribune Premium", code: "PREM", color: "#FECA57", price: 60000, capacity: 1200, rows: 8, seatsPerRow: 20 },
                { id: "standard", name: "Tribune", code: "STD", color: "#4A90FF", price: 30000, capacity: 4500, rows: 15, seatsPerRow: 30 }
            ]
        },
        {
            id: 15,
            name: "R’Abel & Marion — Love Session",
            artist: "R’Abel & Marion",
            description: "La soirée romantique de l'année. Les deux plus belles voix du RnB malgache partagent la scène.",
            emoji: "❤️",
            category: "concerts",
            date_start: "2026-02-14",
            time: "20:00",
            venue: "Carlton",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800",
            capacity: 1200,
            tickets_sold: 1150,
            status: "active",
            organizer: "Romantic Mada",
            zones: [
                { id: "vip", name: "Table Couple VIP", code: "VIP", color: "#FF6B4A", price: 250000, capacity: 200, rows: 5, seatsPerRow: 8 },
                { id: "standard", name: "Chaise Individuelle", code: "STD", color: "#4A90FF", price: 100000, capacity: 1000, rows: 15, seatsPerRow: 15 }
            ]
        },
        {
            id: 16,
            name: "Jazz@Toa — Festival 2026",
            artist: "Multiples",
            description: "Le jazz s'installe à Tamatave. 5 jours de concerts, workshops et jam sessions sous les palmiers.",
            emoji: "🎷",
            category: "festival",
            date_start: "2026-04-12",
            time: "17:00",
            venue: "Place Bien Aimé",
            city: "Toamasina",
            image_url: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800",
            capacity: 5000,
            tickets_sold: 2800,
            status: "active",
            organizer: "Jazz Mada",
            zones: [
                { id: "vip", name: "Pass 5 Jours VIP", code: "VIP", color: "#FF6B4A", price: 200000, capacity: 500, rows: 0, seatsPerRow: 0 },
                { id: "standard", name: "Pass Journee", code: "STD", color: "#4A90FF", price: 50000, capacity: 4500, rows: 0, seatsPerRow: 0 }
            ]
        },
        {
            id: 17,
            name: "Shyn & Denise — Kings of Reunion",
            artist: "Shyn & Denise",
            description: "Le couple royal de la musique malgache moderne revient pour un show explosif. Un mélange de roots, RnB et pop.",
            emoji: "👑",
            category: "concerts",
            date_start: "2026-10-18",
            time: "16:00",
            venue: "Stade Mahamasina",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800",
            capacity: 25000,
            tickets_sold: 18000,
            status: "active",
            organizer: "Makua",
            hot: true,
            zones: [
                { id: "pit", name: "Fosse Or", code: "PIT", color: "#9B59B6", price: 70000, capacity: 2000, rows: 10, seatsPerRow: 40 },
                { id: "standard", name: "Tribune", code: "STD", color: "#4A90FF", price: 30000, capacity: 15000, rows: 20, seatsPerRow: 80 },
                { id: "eco", name: "Pelouse", code: "ECO", color: "#00D9A5", price: 15000, capacity: 8000, rows: 15, seatsPerRow: 100 }
            ]
        },
        {
            id: 18,
            name: "Théâtre — Compagnie Akory",
            artist: "Akory",
            description: "Une pièce drôle et touchante sur la vie quotidienne à Madagascar. Succès critique garanti.",
            emoji: "🎭",
            category: "theatre",
            date_start: "2026-03-22",
            time: "15:00",
            venue: "AFT",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800",
            capacity: 500,
            tickets_sold: 420,
            status: "active",
            organizer: "Akory Theatre",
            zones: [
                { id: "standard", name: "Entrée Unique", code: "STD", color: "#4A90FF", price: 15000, capacity: 500, rows: 10, seatsPerRow: 50 }
            ]
        },
        {
            id: 19,
            name: "Rossy — Tapany lalan-kaleha",
            artist: "Rossy",
            description: "Le ministre du Salegy dans un concert fleuve reprenant 40 ans de carrière politique et musicale.",
            emoji: "🎪",
            category: "concerts",
            date_start: "2026-12-20",
            time: "14:00",
            venue: "Antsonjombe",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=800",
            capacity: 60000,
            tickets_sold: 42000,
            status: "active",
            organizer: "ProRossy",
            hot: true,
            zones: [
                { id: "standard", name: "Tribune", code: "STD", color: "#4A90FF", price: 10000, capacity: 40000, rows: 30, seatsPerRow: 100 },
                { id: "eco", name: "Pelouse", code: "ECO", color: "#00D9A5", price: 5000, capacity: 20000, rows: 20, seatsPerRow: 150 }
            ]
        },
        {
            id: 20,
            name: "Haintso-haintso 2026",
            artist: "Multiples",
            description: "La grande foire de la culture malgache. Artisanat, gastronomie et concerts gratuits avec les billets d'entrée.",
            emoji: "👜",
            category: "exhibition",
            date_start: "2026-08-10",
            time: "09:00",
            venue: "Forello Expo",
            city: "Antananarivo",
            image_url: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800",
            capacity: 10000,
            tickets_sold: 3500,
            status: "active",
            organizer: "EventMada",
            zones: [
                { id: "standard", name: "Ticket Salon", code: "STD", color: "#4A90FF", price: 5000, capacity: 10000, rows: 0, seatsPerRow: 0 }
            ]
        },
        {
            id: 21,
            name: "Roots Reggae Festival",
            artist: "Multiples",
            description: "Le rassemblement reggae de l'année à Antsirabe. Vibes positives et musique engagée.",
            emoji: "🇯🇲",
            category: "festival",
            date_start: "2026-09-24",
            time: "10:00",
            venue: "Stade Velodrome",
            city: "Antsirabe",
            image_url: "https://images.unsplash.com/photo-1514320298324-41d40810167d?w=800",
            capacity: 8000,
            tickets_sold: 4000,
            status: "active",
            organizer: "Roots Mada",
            zones: [
                { id: "standard", name: "Entrée Unique", code: "STD", color: "#4A90FF", price: 15000, capacity: 8000, rows: 0, seatsPerRow: 0 }
            ]
        },
        {
            id: 22,
            name: "Loko Beach Party",
            artist: "DJ Mada",
            description: "La fête des couleurs sur la plage. House music et poudres colorées toute la nuit.",
            emoji: "🌈",
            category: "festival",
            date_start: "2026-07-28",
            time: "22:00",
            venue: "Libanona",
            city: "Fort-Dauphin",
            image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
            capacity: 3000,
            tickets_sold: 2500,
            status: "active",
            organizer: "South Prod",
            hot: true,
            zones: [
                { id: "vip", name: "VIP Beach", code: "VIP", color: "#FF6B4A", price: 100000, capacity: 500, rows: 0, seatsPerRow: 0 },
                { id: "standard", name: "General", code: "STD", color: "#4A90FF", price: 30000, capacity: 2500, rows: 0, seatsPerRow: 0 }
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
                if (path.includes('/orders')) return MockAPI.createOrder(data);
                if (path.includes('/price-alerts')) return MockAPI.setPriceAlert(data);
                if (path.includes('/auth/login')) return MockAPI.login(data.email, data.password);
                return { success: true };
            }
            return this.real.post(path, data);
        }

        // --- Shared state ---
        getUser() {
            const user = localStorage.getItem('ticketmada_user');
            return user ? JSON.parse(user) : null;
        }

        async logout() {
            try {
                const { logout: firebaseLogout } = await import('./firebase-init.js');
                await firebaseLogout();
            } catch (e) {
                console.warn('[SmartAPI] Firebase logout skipped or failed');
            }
            this.clearAuth();
            return { success: true };
        }

        // --- Auth ---
        async register(data) { return this.real.post('/api/auth/register', data); }
        async login(data) { 
            if (this.useMock) return MockAPI.login(data.email, data.password);
            return this.real.post('/api/auth/login', data); 
        }
        
        async loginWithGoogle() {
            try {
                const { loginWithGoogle: firebaseGoogleLogin } = await import('./firebase-init.js');
                const result = await firebaseGoogleLogin();
                if (result.success) {
                    this.setAuth(result.token, result.user);
                }
                return result;
            } catch (error) {
                console.error('[SmartAPI] Google Login Failed:', error);
                return { success: false, error: error.message };
            }
        }

        async oauthLogin(data) { return this.real.post('/api/auth/oauth', data); }

        setAuth(token, user) {
            localStorage.setItem('ticketmada_token', token);
            if (user) localStorage.setItem('ticketmada_user', JSON.stringify(user));
            this.real.token = token;
        }

        clearAuth() {
            localStorage.removeItem('ticketmada_token');
            localStorage.removeItem('ticketmada_user');
            this.real.token = null;
        }

        isLoggedIn() { 
            // Check if token exists and isn't expired (simplistic)
            return !!localStorage.getItem('ticketmada_token');
        }

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
