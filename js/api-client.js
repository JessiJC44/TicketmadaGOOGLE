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
    };    const MOCK_EVENTS = [
        { id: 1, name: "Dama Live — Tournée 2026", artist: "Dama (Mahaleo)", description: "Le légendaire Dama revient sur scène.", emoji: "🎤", category: "concerts", date_start: "2026-06-15", time: "19:00", venue: "Stade Barea", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800", capacity: 15000, tickets_sold: 12500, status: "active", hot: true, zones: [{ id: "std", name: "Standard", price: 40000 }] },
        { id: 2, name: "Festival Donia 2026", artist: "Multiples", description: "Le plus grand festival de l'Océan Indien.", emoji: "🎪", category: "festival", date_start: "2026-07-20", time: "16:00", venue: "Plage Ambatoloaka", city: "Nosy Be", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", capacity: 20000, tickets_sold: 14000, status: "active", hot: true, zones: [{ id: "std", name: "Pass", price: 50000 }] },
        { id: 3, name: "Erick Manana Acoustic", artist: "Erick Manana", description: "Soirée acoustique intime.", emoji: "🎸", category: "concerts", date_start: "2026-05-28", time: "20:00", venue: "Alliance Française", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800", capacity: 800, tickets_sold: 650, status: "active", zones: [{ id: "std", name: "Entrée", price: 35000 }] },
        { id: 4, name: "Samoela & Tence Mena", artist: "Samoela & Tence Mena", description: "Le choc des cultures malgaches.", emoji: "🎶", category: "concerts", date_start: "2026-08-05", time: "18:30", venue: "CCI Ivato", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800", capacity: 5000, tickets_sold: 3800, status: "active", zones: [{ id: "std", name: "Standard", price: 30000 }] },
        { id: 5, name: "Baryon Metal Night", artist: "Baryon", description: "Le métal malgache dans toute sa splendeur.", emoji: "🎸", category: "concerts", date_start: "2026-09-12", time: "19:00", venue: "Palais des Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1514320298324-41d40810167d?w=800", capacity: 6000, tickets_sold: 1200, status: "active", zones: [{ id: "std", name: "Entrée", price: 20000 }] },
        { id: 6, name: "Gasy Humour Show", artist: "GASY Team", description: "Rires garantis pour toute la famille.", emoji: "😂", category: "humour", date_start: "2026-05-15", venue: "IFM Tana", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800", capacity: 1000, tickets_sold: 800, status: "active", zones: [{ id: "std", name: "Normal", price: 10000 }] },
        { id: 7, name: "Jaojoby au Glacier", artist: "Jaojoby", description: "Le Roi du Salegy vous fait danser.", emoji: "🎷", category: "concerts", date_start: "2026-08-20", venue: "Le Glacier", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800", capacity: 400, tickets_sold: 250, status: "active", zones: [{ id: "std", name: "PAF", price: 25000 }] },
        { id: 8, name: "Makis vs Kenya", artist: "XV de Madagascar", description: "Match international de rugby.", emoji: "🏉", category: "sports", date_start: "2026-05-20", venue: "Stade Mahamasina", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1544698310-74ea9d1c8288?w=800", capacity: 25000, tickets_sold: 21000, status: "active", hot: true, zones: [{ id: "std", name: "Gradins", price: 5000 }] },
        { id: 9, name: "Somaroho 2026", artist: "Wawa", description: "Le festival mythique de Nosy Be.", emoji: "💃", category: "festival", date_start: "2026-08-15", venue: "Nosy Be", city: "Nosy Be", image_url: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800", capacity: 30000, tickets_sold: 22000, status: "active", zones: [{ id: "std", name: "Entrée", price: 15000 }] },
        { id: 10, name: "Francis Turbo Solo", artist: "Francis Turbo", description: "Humour décapant.", emoji: "🎤", category: "humour", date_start: "2026-03-30", venue: "Palais des Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1541533232361-9c3f0f70e9a5?w=800", capacity: 6000, tickets_sold: 5800, status: "active", zones: [{ id: "std", name: "Normal", price: 15000 }] },
        { id: 11, name: "Bodo Diva — Live", artist: "Bodo", description: "La diva de Madagascar fête sa carrière.", emoji: "👗", category: "concerts", date_start: "2026-05-10", venue: "Palais des Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800", capacity: 6000, tickets_sold: 4500, status: "active", zones: [{ id: "std", name: "Vip", price: 50000 }] },
        { id: 12, name: "AmbondronA Rock", artist: "AmbondronA", description: "Le rock n°1 de Madagascar.", emoji: "🤘", category: "concerts", date_start: "2026-09-05", venue: "Antsonjombe", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800", capacity: 50000, tickets_sold: 35000, status: "active", zones: [{ id: "std", name: "Tribune", price: 20000 }] },
        { id: 13, name: "Jazz à l'AFT", artist: "Jazz Collective", description: "Le renouveau du jazz malgache.", emoji: "🎷", category: "concerts", date_start: "2026-10-01", venue: "Jardin AFT", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800", capacity: 1500, status: "active", zones: [{ id: "std", name: "Entrée", price: 25000 }] },
        { id: 14, name: "Rugby: Gasy vs Namibie", artist: "Makis de Madagascar", description: "Qualificatif pour la Coupe du Monde.", emoji: "🏉", category: "sports", date_start: "2026-06-12", venue: "Stade Barea", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800", capacity: 40000, status: "active", zones: [{ id: "std", name: "Populaire", price: 5000 }] },
        { id: 15, name: "Rossy en Fête", artist: "Rossy", description: "L'Avaradrano célèbre avec Rossy.", emoji: "🎶", category: "concerts", date_start: "2026-04-10", venue: "Antsonjombe", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800", capacity: 40000, status: "active", zones: [{ id: "std", name: "Pelouse", price: 5000 }] },
        { id: 16, name: "Fiera Mada Expo", artist: "Exposants", description: "Grande foire économique.", emoji: "💼", category: "exhibition", date_start: "2026-06-01", venue: "Forello", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800", capacity: 10000, status: "active", zones: [{ id: "std", name: "Ticket", price: 5000 }] },
        { id: 17, name: "Night with Rim-Ka", artist: "Rim-Ka", description: "Le rap malgache à son sommet.", emoji: "🧢", category: "concerts", date_start: "2026-07-15", venue: "Palladium", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800", capacity: 1000, status: "active", zones: [{ id: "std", name: "PAF", price: 30000 }] },
        { id: 18, name: "Théâtre: Akory Iny !", artist: "Dago Théâtre", description: "Comédie satirique.", emoji: "🎭", category: "theatre", date_start: "2026-09-20", venue: "AFT", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800", capacity: 500, status: "active", zones: [{ id: "std", name: "Normal", price: 15000 }] },
        { id: 19, name: "Beach Party Foulpointe", artist: "DJ Rolly", description: "Pool & Beach party on the coast.", emoji: "🏖️", category: "festival", date_start: "2026-08-30", venue: "La Plage", city: "Toamasina", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", capacity: 2000, status: "active", zones: [{ id: "std", name: "PAF", price: 20000 }] },
        { id: 20, name: "Foire de Fianar", artist: "Artisans Betsileo", description: "Tradition et artisanat.", emoji: "🏺", category: "exhibition", date_start: "2026-10-15", venue: "Gare Fianar", city: "Fianarantsoa", image_url: "https://images.unsplash.com/photo-1531265726475-52ad60219627?w=800", capacity: 5000, status: "active", zones: [{ id: "std", name: "Entrée", price: 2000 }] },
        { id: 21, name: "Mr Sayda — M'lay Be", artist: "Mr Sayda", description: "Concert intimiste.", emoji: "🎙️", category: "concerts", date_start: "2026-05-02", venue: "IFM", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800", capacity: 600, status: "active", zones: [{ id: "std", name: "PAF", price: 20000 }] },
        { id: 22, name: "Rock Revival", artist: "Gasy Rocks", description: "Les années 70 revisitées.", emoji: "🎸", category: "concerts", date_start: "2026-11-20", venue: "Piment Café", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800", capacity: 200, status: "active", zones: [{ id: "std", name: "PAF", price: 25000 }] },
        { id: 23, name: "Marathon de Tana", artist: "Athlètes", description: "La course des mille collines.", emoji: "🏃", category: "sports", date_start: "2026-10-25", venue: "Analakely", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=800", capacity: 5000, status: "active", zones: [{ id: "std", name: "Inscr.", price: 10000 }] },
        { id: 24, name: "Fashion Show 26", artist: "Stylistes Mada", description: "Défilé haute couture.", emoji: "👗", category: "theatre", date_start: "2026-04-15", venue: "Carlton", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800", capacity: 500, status: "active", zones: [{ id: "std", name: "VIP", price: 150000 }] },
        { id: 25, name: "Opera: Traviata", artist: "Chœur Gasy", description: "Opéra au Palais.", emoji: "🎼", category: "theatre", date_start: "2026-03-12", venue: "Palais d'Ambohimanga", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800", capacity: 300, status: "active", zones: [{ id: "std", name: "Normal", price: 50000 }] },
        { id: 26, name: "Electro Night", artist: "Digital Team", description: "Best DJs of the Island.", emoji: "🎧", category: "concerts", date_start: "2026-02-14", venue: "Le Six", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800", capacity: 800, status: "active", zones: [{ id: "std", name: "Entrée", price: 30000 }] },
        { id: 27, name: "Loko Gasy 26", artist: "Groupes Locaux", description: "Saveurs et traditions.", emoji: "🎨", category: "festival", date_start: "2026-05-05", venue: "Coliseum", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", capacity: 50000, status: "active", zones: [{ id: "std", name: "Unique", price: 5000 }] },
        { id: 28, name: "Rallye National", artist: "Pilotes Mada", description: "Sensations fortes sur les pistes.", emoji: "🏎️", category: "sports", date_start: "2026-11-12", venue: "Tana Pistes", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?w=800", capacity: 10000, status: "active", zones: [{ id: "std", name: "Gradin", price: 10000 }] },
        { id: 29, name: "Samoela 25 ans", artist: "Samoela", description: "Le boss de la variété malgache.", emoji: "🎙️", category: "concerts", date_start: "2026-12-25", venue: "STADE", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800", capacity: 40000, status: "active", zones: [{ id: "std", name: "PAF", price: 5000 }] },
        { id: 30, name: "Fête de la Baleine", artist: "Sainte Marie", description: "Admirez les baleines à bosse.", emoji: "🐋", category: "festival", date_start: "2026-09-10", venue: "Port-Sainte-Marie", city: "Toamasina", image_url: "https://images.unsplash.com/photo-1550965316-28956973e4de?w=800", capacity: 5000, status: "active", zones: [{ id: "std", name: "Pass", price: 20000 }] },
        { id: 31, name: "Art Contemporain", artist: "Peintres Malgaches", description: "Exhibition d'art moderne.", emoji: "🖼️", category: "exhibition", date_start: "2026-02-20", venue: "Maison Culture", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800", capacity: 2000, status: "active", zones: [{ id: "std", name: "Entrée", price: 5000 }] },
        { id: 32, name: "DJ Seth World Tour", artist: "DJ Seth", description: "La légende de la nuit.", emoji: "📀", category: "concerts", date_start: "2026-06-20", venue: "Mojo", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800", capacity: 500, status: "active", zones: [{ id: "std", name: "PAF", price: 30000 }] },
        { id: 33, name: "Fou Hehy Team Live", artist: "Fou Hehy", description: "Le retour du duo mythique.", emoji: "😆", category: "humour", date_start: "2026-10-30", venue: "CCEsca", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1527224857853-eb3dc505f778?w=800", capacity: 1000, status: "active", zones: [{ id: "std", name: "Vip", price: 15000 }] },
        { id: 34, name: "Salegy Majunga", artist: "Artistes Locaux", description: "Ambiance tropicale garantie.", emoji: "💃", category: "concerts", date_start: "2026-07-12", venue: "Village Majunga", city: "Mahajanga", image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800", capacity: 2000, status: "active", zones: [{ id: "std", name: "Normal", price: 10000 }] },
        { id: 35, name: "Festival Tuléar", artist: "South Group", description: "Musique Tsapiky au bord de l'eau.", emoji: "🌵", category: "festival", date_start: "2026-12-01", venue: "Stade Tuléar", city: "Toliara", image_url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800", capacity: 10000, status: "active", zones: [{ id: "std", name: "Entrée", price: 5000 }] },
        { id: 36, name: "New Year Bash", artist: "All Stars", description: "Le réveillon géant.", emoji: "🎆", category: "festival", date_start: "2026-12-31", venue: "Palais Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", capacity: 6000, status: "active", zones: [{ id: "std", name: "Unique", price: 50000 }] },
        { id: 37, name: "Shyn & Denise Live", artist: "Shyn & Denise", description: "Le duo glamour de Madagascar.", emoji: "💑", category: "concerts", date_start: "2026-11-15", venue: "Palais Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1514320298324-41d40810167d?w=800", capacity: 6000, status: "active", zones: [{ id: "std", name: "Vip", price: 40000 }] },
        { id: 38, name: "Rugby: Finale Coupe", artist: "Finalistes", description: "Le choc des titans malgaches.", emoji: "🏉", category: "sports", date_start: "2026-12-05", venue: "Stade Barea", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1544698310-74ea9d1c8288?w=800", capacity: 40000, status: "active", zones: [{ id: "std", name: "Tribune", price: 10000 }] },
        { id: 39, name: "Exposition Artisanale", artist: "Madagascar Crafts", description: "Le meilleur de l'artisanat local.", emoji: "🧶", category: "exhibition", date_start: "2026-08-01", venue: "Avenue Independance", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800", capacity: 5000, status: "active", zones: [{ id: "std", name: "Gratuit", price: 0 }] },
        { id: 40, name: "Basket: Play-offs", artist: "Elite Team", description: "La finale du championnat national.", emoji: "🏀", category: "sports", date_start: "2026-10-10", venue: "Palais Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800", capacity: 6000, status: "active", zones: [{ id: "std", name: "PAF", price: 10000 }] }
    ];

    const MOCK_EVENTS_FINAL = MOCK_EVENTS.map(e => ({
        ...e,
        image_url: (e.image_url && e.image_url.trim() !== "") ? e.image_url : (CATEGORY_PLACEHOLDERS[e.category] || CATEGORY_PLACEHOLDERS.default)
    }));

    // Mock artists data
    const MOCK_ARTISTS = [
        { name: "Dama (Mahaleo)", genre: "Folk / Chanson", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200", bio: "Membre fondateur du groupe légendaire Mahaleo." },
        { name: "Erick Manana", genre: "Guitare / Traditionnel", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200", bio: "Virtuose de la guitare malgache." }
    ];

    // =========================================================================
    // MOCK API METHODS — Return mock data as if from a real API
    // =========================================================================

    const MockAPI = {
        getEvents(filters = {}) {
            let events = [...MOCK_EVENTS_FINAL];
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
            const event = MOCK_EVENTS_FINAL.find(e => e.id === parseInt(id));
            if (!event) return { event: MOCK_EVENTS_FINAL[0] }; // fallback to first event
            return { event };
        },

        getEventSeats(eventId) {
            const event = MOCK_EVENTS_FINAL.find(e => e.id === parseInt(eventId));
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
                total_tickets_sold: MOCK_EVENTS_FINAL.reduce((s, e) => s + e.tickets_sold, 0),
                total_revenue: MOCK_EVENTS_FINAL.reduce((s, e) => {
                    const avgPrice = e.zones ? (e.zones.reduce((a, z) => a + z.price, 0) / e.zones.length) : 20000;
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
