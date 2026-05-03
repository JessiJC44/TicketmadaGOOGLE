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
        totalRevenue: 245000000,
        totalTicketsSold: 12500,
        activeEvents: 42,
        totalUsers: 8500,
        activeOrganizers: 156,
        pendingApplications: 1,
        totalEvents: 184,
        blockedUsers: 8,
        totalCommission: 7350000,
        avgFillRate: 72,
        monthlyRevenue: [
            { month: '2025-06', revenue: 12000000 },
            { month: '2025-07', revenue: 15000000 },
            { month: '2025-08', revenue: 22000000 },
            { month: '2025-09', revenue: 18000000 },
            { month: '2025-10', revenue: 25000000 },
            { month: '2025-11', revenue: 30000000 },
            { month: '2025-12', revenue: 45000000 },
            { month: '2026-01', revenue: 20000000 },
            { month: '2026-02', revenue: 15000000 },
            { month: '2026-03', revenue: 18000000 },
            { month: '2026-04', revenue: 25000000 }
        ],
        categoryDistribution: [
            { category: 'concerts', ticket_count: 5200 },
            { category: 'festival', ticket_count: 4100 },
            { category: 'sports', ticket_count: 2100 },
            { category: 'theatre', ticket_count: 800 },
            { category: 'exhibition', ticket_count: 300 }
        ],
        topEvents: [
            { id: 1, name: "Dama Live — Tournée 2026", tickets_sold: 12500, revenue: 125000000 },
            { id: 2, name: "Festival Donia 2026", tickets_sold: 14000, revenue: 85000000 },
            { id: 8, name: "Makis vs Kenya", tickets_sold: 21000, revenue: 42000000 },
            { id: 12, name: "AmbondronA Rock", tickets_sold: 35000, revenue: 70000000 },
            { id: 15, name: "Rossy en Fête", tickets_sold: 30000, revenue: 60000000 }
        ],
        recentActivity: [
            { id: 1, type: 'ticket_purchased', actor_name: 'Jean Rakoto', description: 'Jean Rakoto a acheté 2 billets pour Dama Live', created_at: new Date().toISOString() },
            { id: 2, type: 'organizer_application_submitted', actor_name: 'Rakoto Jean', description: 'Nouvelle demande d\'organisateur de Rakoto Jean', created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: 3, type: 'event_created', actor_name: 'Samoela Ent.', description: 'Nouvel événement créé: Samoela Acoustic', created_at: new Date(Date.now() - 7200000).toISOString() },
            { id: 4, type: 'user_registered', actor_name: 'Miora Soa', description: 'Nouvel utilisateur inscrit: Miora Soa', created_at: new Date(Date.now() - 86400000).toISOString() }
        ]
    };

    const MOCK_SUPERADMIN_ORGANIZERS = [
        { id: 101, name: "Samoela Ent.", email: "samoela@ent.mg", status: "active", events_count: 12, total_revenue: 150000000, total_commission: 4500000, created_at: "2024-01-10" },
        { id: 102, name: "Madagascar Events", email: "contact@madevents.com", status: "active", events_count: 8, total_revenue: 85000000, total_commission: 2550000, created_at: "2024-02-15" },
        { id: 103, name: "Dago Productions", email: "prod@dago.mg", status: "suspended", events_count: 5, total_revenue: 42000000, total_commission: 1260000, created_at: "2024-03-20" }
    ];

    const MOCK_SUPERADMIN_USERS = [
        { id: 201, name: "Jean Rakoto", email: "jean@gmail.com", status: "active", purchaseCount: 15, totalSpent: 450000, lastPurchase: "2026-04-20", created_at: "2025-05-10" },
        { id: 202, name: "Miora Soa", email: "miora@yahoo.fr", status: "active", purchaseCount: 2, totalSpent: 80000, lastPurchase: "2026-04-25", created_at: "2026-04-01" },
        { id: 203, name: "Fidy Antsa", email: "fidy@gmail.com", status: "blocked", purchaseCount: 0, totalSpent: 0, lastPurchase: null, created_at: "2026-04-10" }
    ];
    const MOCK_APPLICATIONS = [
        { 
            id: "app_1", 
            uid: "buyer_01", 
            fullName: "Rakoto Jean", 
            email: "rakoto@gmail.com", 
            phone: "034 00 123 45", 
            city: "Antananarivo", 
            organizationName: "Rakoto Events", 
            organizationDescription: "Concerts de jazz et folk.", 
            motivation: "Je souhaite professionaliser ma billetterie sur TicketMada.", 
            status: "pending", 
            createdAt: new Date(Date.now() - 86400000).toISOString() 
        }
    ];

    const MOCK_EVENTS = [
        { id: 1, name: "Dama Live — Tournée 2026", artist: "Dama (Mahaleo)", description: "Le légendaire Dama revient sur scène.", emoji: "🎤", category: "concerts", date_start: "2026-06-15", time: "19:00", venue: "Stade Barea", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800", capacity: 15000, tickets_sold: 12500, status: "active", hot: true, zones: ZONE_TEMPLATES.concert },
        { id: 2, name: "Festival Donia 2026", artist: "Multiples", description: "Le plus grand festival de l'Océan Indien.", emoji: "🎪", category: "festival", date_start: "2026-07-20", time: "16:00", venue: "Plage Ambatoloaka", city: "Nosy Be", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", capacity: 20000, tickets_sold: 14000, status: "active", hot: true, zones: ZONE_TEMPLATES.festival },
        { id: 3, name: "Erick Manana Acoustic", artist: "Erick Manana", description: "Soirée acoustique intime.", emoji: "🎸", category: "concerts", date_start: "2026-05-28", time: "20:00", venue: "Alliance Française", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800", capacity: 800, tickets_sold: 650, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 4, name: "Samoela & Tence Mena", artist: "Samoela & Tence Mena", description: "Le choc des cultures malgaches.", emoji: "🎶", category: "concerts", date_start: "2026-08-05", time: "18:30", venue: "CCI Ivato", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800", capacity: 5000, tickets_sold: 3800, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 5, name: "Baryon Metal Night", artist: "Baryon", description: "Le métal malgache dans toute sa splendeur.", emoji: "🎸", category: "concerts", date_start: "2026-09-12", time: "19:00", venue: "Palais des Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1514320298324-41d40810167d?w=800", capacity: 6000, tickets_sold: 1200, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 6, name: "Gasy Humour Show", artist: "GASY Team", description: "Rires garantis pour toute la famille.", emoji: "😂", category: "humour", date_start: "2026-05-15", venue: "IFM Tana", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800", capacity: 1000, tickets_sold: 800, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 7, name: "Jaojoby au Glacier", artist: "Jaojoby", description: "Le Roi du Salegy vous fait danser.", emoji: "🎷", category: "concerts", date_start: "2026-08-20", venue: "Le Glacier", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800", capacity: 400, tickets_sold: 250, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 8, name: "Makis vs Kenya", artist: "XV de Madagascar", description: "Match international de rugby.", emoji: "🏉", category: "sports", date_start: "2026-05-20", venue: "Stade Mahamasina", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1544698310-74ea9d1c8288?w=800", capacity: 25000, tickets_sold: 21000, status: "active", hot: true, zones: ZONE_TEMPLATES.sports },
        { id: 9, name: "Somaroho 2026", artist: "Wawa", description: "Le festival mythique de Nosy Be.", emoji: "💃", category: "festival", date_start: "2026-08-15", venue: "Nosy Be", city: "Nosy Be", image_url: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800", capacity: 30000, tickets_sold: 22000, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 10, name: "Francis Turbo Solo", artist: "Francis Turbo", description: "Humour décapant.", emoji: "🎤", category: "humour", date_start: "2026-03-30", venue: "Palais des Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1541533232361-9c3f0f70e9a5?w=800", capacity: 6000, tickets_sold: 5800, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 11, name: "Bodo Diva — Live", artist: "Bodo", description: "La diva de Madagascar fête sa carrière.", emoji: "👗", category: "concerts", date_start: "2026-05-10", venue: "Palais des Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800", capacity: 6000, tickets_sold: 4500, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 12, name: "AmbondronA Rock", artist: "AmbondronA", description: "Le rock n°1 de Madagascar.", emoji: "🤘", category: "concerts", date_start: "2026-09-05", venue: "Antsonjombe", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800", capacity: 50000, tickets_sold: 35000, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 13, name: "Jazz à l'AFT", artist: "Jazz Collective", description: "Le renouveau du jazz malgache.", emoji: "🎷", category: "concerts", date_start: "2026-10-01", venue: "Jardin AFT", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800", capacity: 1500, tickets_sold: 900, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 14, name: "Rugby: Gasy vs Namibie", artist: "Makis de Madagascar", description: "Qualificatif pour la Coupe du Monde.", emoji: "🏉", category: "sports", date_start: "2026-06-12", venue: "Stade Barea", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800", capacity: 40000, tickets_sold: 21000, status: "active", zones: ZONE_TEMPLATES.sports },
        { id: 15, name: "Rossy en Fête", artist: "Rossy", description: "L'Avaradrano célèbre avec Rossy.", emoji: "🎶", category: "concerts", date_start: "2026-04-10", venue: "Antsonjombe", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800", capacity: 40000, tickets_sold: 30000, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 16, name: "Fiera Mada Expo", artist: "Exposants", description: "Grande foire économique.", emoji: "💼", category: "exhibition", date_start: "2026-06-01", venue: "Forello", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800", capacity: 10000, tickets_sold: 4000, status: "active", zones: ZONE_TEMPLATES.exhibition },
        { id: 17, name: "Night with Rim-Ka", artist: "Rim-Ka", description: "Le rap malgache à son sommet.", emoji: "🧢", category: "concerts", date_start: "2026-07-15", venue: "Palladium", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800", capacity: 1000, tickets_sold: 600, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 18, name: "Théâtre: Akory Iny !", artist: "Dago Théâtre", description: "Comédie satirique.", emoji: "🎭", category: "theatre", date_start: "2026-09-20", venue: "AFT", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800", capacity: 500, tickets_sold: 300, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 21, name: "Mr Sayda — M'lay Be", artist: "Mr Sayda", description: "Concert intimiste.", emoji: "🎙️", category: "concerts", date_start: "2026-05-02", venue: "IFM", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800", capacity: 600, tickets_sold: 550, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 22, name: "Rock Revival", artist: "Gasy Rocks", description: "Les années 70 revisitées.", emoji: "🎸", category: "concerts", date_start: "2026-11-20", venue: "Piment Café", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800", capacity: 200, tickets_sold: 150, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 23, name: "Marathon de Tana", artist: "Athlètes", description: "La course des mille collines.", emoji: "🏃", category: "sports", date_start: "2026-10-25", venue: "Analakely", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=800", capacity: 5000, tickets_sold: 3000, status: "active", zones: ZONE_TEMPLATES.sports },
        { id: 24, name: "Fashion Show 26", artist: "Stylistes Mada", description: "Défilé haute couture.", emoji: "👗", category: "theatre", date_start: "2026-04-15", venue: "Carlton", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800", capacity: 500, tickets_sold: 450, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 25, name: "Opera: Traviata", artist: "Chœur Gasy", description: "Opéra au Palais.", emoji: "🎼", category: "theatre", date_start: "2026-03-12", venue: "Palais d'Ambohimanga", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800", capacity: 300, tickets_sold: 250, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 26, name: "Electro Night", artist: "Digital Team", description: "Best DJs of the Island.", emoji: "🎧", category: "concerts", date_start: "2026-02-14", venue: "Le Six", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800", capacity: 800, tickets_sold: 700, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 28, name: "Rallye National", artist: "Pilotes Mada", description: "Sensations fortes sur les pistes.", emoji: "🏎️", category: "sports", date_start: "2026-11-12", venue: "Tana Pistes", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?w=800", capacity: 10000, tickets_sold: 5000, status: "active", zones: ZONE_TEMPLATES.sports },
        { id: 29, name: "Samoela 25 ans", artist: "Samoela", description: "Le boss de la variété malgache.", emoji: "🎙️", category: "concerts", date_start: "2026-12-25", venue: "STADE", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800", capacity: 40000, tickets_sold: 35000, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 31, name: "Art Contemporain", artist: "Peintres Malgaches", description: "Exhibition d'art moderne.", emoji: "🖼️", category: "exhibition", date_start: "2026-02-20", venue: "Maison Culture", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800", capacity: 2000, tickets_sold: 400, status: "active", zones: ZONE_TEMPLATES.exhibition },
        { id: 32, name: "DJ Seth World Tour", artist: "DJ Seth", description: "La légende de la nuit.", emoji: "📀", category: "concerts", date_start: "2026-06-20", venue: "Mojo", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800", capacity: 500, tickets_sold: 450, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 33, name: "Fou Hehy Team Live", artist: "Fou Hehy", description: "Le retour du duo mythique.", emoji: "😆", category: "humour", date_start: "2026-10-30", venue: "CCEsca", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1527224857853-eb3dc505f778?w=800", capacity: 1000, tickets_sold: 900, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 34, name: "Salegy Majunga", artist: "Artistes Locaux", description: "Ambiance tropicale garantie.", emoji: "💃", category: "concerts", date_start: "2026-07-12", venue: "Village Majunga", city: "Mahajanga", image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800", capacity: 2000, tickets_sold: 1500, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 37, name: "Shyn & Denise Live", artist: "Shyn & Denise", description: "Le duo glamour de Madagascar.", emoji: "💑", category: "concerts", date_start: "2026-11-15", venue: "Palais Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1514320298324-41d40810167d?w=800", capacity: 6000, tickets_sold: 5000, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 38, name: "Rugby: Finale Coupe", artist: "Finalistes", description: "Le choc des titans malgaches.", emoji: "🏉", category: "sports", date_start: "2026-12-05", venue: "Stade Barea", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1544698310-74ea9d1c8288?w=800", capacity: 40000, tickets_sold: 38000, status: "active", zones: ZONE_TEMPLATES.sports },
        { id: 39, name: "Exposition Artisanale", artist: "Madagascar Crafts", description: "Le meilleur de l'artisanat local.", emoji: "🧶", category: "exhibition", date_start: "2026-08-01", venue: "Avenue Independance", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800", capacity: 5000, tickets_sold: 1000, status: "active", zones: ZONE_TEMPLATES.exhibition },
        { id: 40, name: "Basket: Play-offs", artist: "Elite Team", description: "La finale du championnat national.", emoji: "🏀", category: "sports", date_start: "2026-10-10", venue: "Palais Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800", capacity: 6000, tickets_sold: 5500, status: "active", zones: ZONE_TEMPLATES.sports },
        // Festival template additions
        { id: 19, name: "Beach Party Foulpointe", artist: "DJ Rolly", description: "Pool & Beach party on the coast.", emoji: "🏖️", category: "festival", date_start: "2026-08-30", venue: "La Plage", city: "Toamasina", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", capacity: 2000, tickets_sold: 1500, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 27, name: "Loko Gasy 26", artist: "Groupes Locaux", description: "Saveurs et traditions.", emoji: "🎨", category: "festival", date_start: "2026-05-05", venue: "Coliseum", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", capacity: 50000, tickets_sold: 20000, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 30, name: "Fête de la Baleine", artist: "Sainte Marie", description: "Admirez les baleines à bosse.", emoji: "🐋", category: "festival", date_start: "2026-09-10", venue: "Port-Sainte-Marie", city: "Toamasina", image_url: "https://images.unsplash.com/photo-1550965316-28956973e4de?w=800", capacity: 5000, tickets_sold: 2500, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 35, name: "Festival Tuléar", artist: "South Group", description: "Musique Tsapiky au bord de l'eau.", emoji: "🌵", category: "festival", date_start: "2026-12-01", venue: "Stade Tuléar", city: "Toliara", image_url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800", capacity: 10000, tickets_sold: 6000, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 36, name: "New Year Bash", artist: "All Stars", description: "Le réveillon géant.", emoji: "🎆", category: "festival", date_start: "2026-12-31", venue: "Palais Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", capacity: 6000, tickets_sold: 5000, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 20, name: "Zamba Gospel Celebration", artist: "Chœur Zamba", description: "Une nuit de louange.", emoji: "🙏", category: "concerts", date_start: "2026-05-30", venue: "Ekar Antanimena", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800", capacity: 1200, tickets_sold: 1000, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 41, name: "Gasy Gourmet Festival", artist: "Chefs Malgaches", description: "Le meilleur de la gastronomie.", emoji: "🍲", category: "festival", date_start: "2026-06-25", venue: "Jardin Mahamasina", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800", capacity: 3000, tickets_sold: 1500, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 42, name: "Madagascar Tech Summit", artist: "Tech Leaders", description: "Le futur du numérique à Mada.", emoji: "💻", category: "exhibition", date_start: "2026-11-05", venue: "CCI Ivato", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800", capacity: 2000, tickets_sold: 800, status: "active", zones: ZONE_TEMPLATES.exhibition }
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

    const MOCK_SCAN_LINKS = [
        { 
            token: 'sL_demo_concert_01', 
            event_id: 1, 
            label: 'Staff Entrée Principale',
            link: window.location.origin + '/User/ticketmada-scanner.html?token=sL_demo_concert_01',
            created_at: '2026-04-10',
            expires_at: '2026-04-16',
            is_active: true,
            devicesCount: 3,
            totalScans: 174
        },
        { 
            token: 'sL_demo_concert_02', 
            event_id: 1, 
            label: 'Staff VIP',
            link: window.location.origin + '/User/ticketmada-scanner.html?token=sL_demo_concert_02',
            created_at: '2026-04-10',
            expires_at: '2026-04-16',
            is_active: true,
            devicesCount: 1,
            totalScans: 23
        }
    ];

    const MOCK_SCAN_DEVICES = [
        { id: 1, scan_link_id: 1, event_id: 1, device_name: 'Staff Entrée A', browser: 'Chrome Mobile 120', os: 'Android 14', device_model: 'Samsung Galaxy S24', ip_address: '192.168.1.45', is_blocked: false, scan_count: 87, last_activity: 'Il y a 2 min', first_connected: '2026-04-15T13:30:00', event_name: 'Dama Live — Tournée 2026' },
        { id: 2, scan_link_id: 1, event_id: 1, device_name: 'Staff Entrée B', browser: 'Safari 17.4', os: 'iOS 17.4', device_model: 'iPhone 15 Pro', ip_address: '192.168.1.52', is_blocked: false, scan_count: 64, last_activity: 'Il y a 5 min', first_connected: '2026-04-15T13:35:00', event_name: 'Dama Live — Tournée 2026' },
        { id: 3, scan_link_id: 2, event_id: 1, device_name: 'Staff VIP', browser: 'Chrome Mobile 119', os: 'Android 13', device_model: 'Xiaomi 13T', ip_address: '192.168.1.78', is_blocked: false, scan_count: 23, last_activity: 'Il y a 8 min', first_connected: '2026-04-15T14:00:00', event_name: 'Dama Live — Tournée 2026' },
        { id: 4, scan_link_id: 1, event_id: 1, device_name: 'Appareil suspect', browser: 'Firefox 121', os: 'Android 12', device_model: 'Unknown', ip_address: '10.0.0.99', is_blocked: true, block_reason: 'Tentative non autorisée', blocked_at: '2026-04-15T15:42:00', scan_count: 2, last_activity: '2026-04-15T15:42:00', event_name: 'Dama Live — Tournée 2026' }
    ];

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
            console.log('[SmartAPI] PUT', path, data);
            if (path.match(/\/organizer-applications\/(.+)\/approve/)) {
                const id = path.match(/\/organizer-applications\/(.+)\/approve/)[1];
                const app = MOCK_APPLICATIONS.find(a => a.id === id);
                if (app) {
                    app.status = 'approved';
                    console.log('%c[EMAIL SIMULATION] TO: ' + app.email, 'background: #00D9A5; color: black; padding: 5px;', 'Welcome to TicketMada! Your organizer account is now active. Access your dashboard here: http://localhost:3000/Admin/ticketmada-dashboard.html');
                    MOCK_SUPERADMIN_STATS.pendingApplications = MOCK_APPLICATIONS.filter(a => a.status === 'pending').length;
                    return { success: true };
                }
            }
            if (path.match(/\/organizer-applications\/(.+)\/reject/)) {
                const id = path.match(/\/organizer-applications\/(.+)\/reject/)[1];
                const app = MOCK_APPLICATIONS.find(a => a.id === id);
                if (app) {
                    app.status = 'rejected';
                    console.log('%c[EMAIL SIMULATION] TO: ' + app.email, 'background: #E74C3C; color: white; padding: 5px;', 'Your application has been rejected. Reason: ' + (data?.reason || 'Non spécifiée'));
                    MOCK_SUPERADMIN_STATS.pendingApplications = MOCK_APPLICATIONS.filter(a => a.status === 'pending').length;
                    return { success: true };
                }
            }
            return this.request(path, { method: 'PUT', body: data });
        }

        setAuth(token, user = null) { 
            this.token = token; 
            localStorage.setItem('ticketmada_token', token);
            if (user) localStorage.setItem('ticketmada_user', JSON.stringify(user));
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
                const { logout: firebaseLogout } = await import('./firebase-init.js');
                await firebaseLogout();
            } catch (e) {
                console.warn('[SmartAPI] Firebase logout skipped or failed');
            }
            this.clearAuth();
            return { success: true };
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
                const { loginWithGoogle: firebaseGoogleLogin } = await import('./firebase-init.js');
                const result = await firebaseGoogleLogin();
                
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
                        
                        if (syncResult && syncResult.token) {
                            console.log('[SmartAPI] Backend sync successful');
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
                    return new Promise((resolve) => {
                        window.OAuthSim.show('Google', (name, email) => {
                            const user = { name, email, role: 'buyer', id: Date.now() };
                            this.setAuth('mock-google-token', user);
                            resolve({ success: true, token: 'mock-google-token', user });
                        });
                    });
                }
                return { success: false, error: error.message || 'Unknown error' };
            }
        }

        async oauthLogin(data) { return this.real.post('/api/auth/oauth', data); }

        setAuth(token, user) { this.real.setAuth(token, user); }
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
