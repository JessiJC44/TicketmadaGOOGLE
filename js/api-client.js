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

    const MOCK_EVENTS = [
        { id: 1, name: "Dama Live — Tournée 2026", artist: "Dama (Mahaleo)", description: "Le légendaire Dama revient sur scène pour une tournée historique à travers Madagascar.", emoji: "🎤", category: "concerts", date_start: "2026-06-15", time: "19:00", venue: "Stade Barea", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800", capacity: 15000, tickets_sold: 12500, status: "active", hot: true, zones: ZONE_TEMPLATES.concert },
        { id: 2, name: "Festival Donia 2026", artist: "Multiples", description: "Le plus grand festival de l'Océan Indien revient à Nosy Be.", emoji: "🎪", category: "festival", date_start: "2026-07-20", time: "16:00", venue: "Plage Ambatoloaka", city: "Nosy Be", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", capacity: 20000, tickets_sold: 14000, status: "active", hot: true, zones: ZONE_TEMPLATES.festival },
        { id: 3, name: "Erick Manana Acoustic", artist: "Erick Manana", description: "Soirée acoustique intime avec le virtuose de la guitare malgache.", emoji: "🎸", category: "concerts", date_start: "2026-05-28", time: "20:00", venue: "Alliance Française", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800", capacity: 800, tickets_sold: 650, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 4, name: "Samoela & Tence Mena", artist: "Samoela & Tence Mena", description: "Le choc des cultures musicales malgaches sur une même scène.", emoji: "🎶", category: "concerts", date_start: "2026-08-05", time: "18:30", venue: "CCI Ivato", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800", capacity: 5000, tickets_sold: 3800, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 5, name: "Baryon Metal Night", artist: "Baryon", description: "Le métal malgache dans toute sa splendeur.", emoji: "🎸", category: "concerts", date_start: "2026-09-12", time: "19:00", venue: "Palais des Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1514320298324-41d40810167d?w=800", capacity: 6000, tickets_sold: 1200, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 6, name: "Gasy Humour Show", artist: "GASY Team", description: "Rires garantis pour toute la famille.", emoji: "😂", category: "humour", date_start: "2026-05-15", venue: "IFM Tana", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800", capacity: 1000, tickets_sold: 800, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 7, name: "Jaojoby au Glacier", artist: "Jaojoby", description: "Le Roi du Salegy vous fait danser toute la nuit.", emoji: "🎷", category: "concerts", date_start: "2026-08-20", venue: "Le Glacier", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800", capacity: 400, tickets_sold: 250, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 8, name: "Makis vs Kenya", artist: "XV de Madagascar", description: "Match international de rugby — les Makis affrontent le Kenya.", emoji: "🏉", category: "sports", date_start: "2026-05-20", venue: "Stade Mahamasina", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1544698310-74ea9d1c8288?w=800", capacity: 25000, tickets_sold: 21000, status: "active", hot: true, zones: ZONE_TEMPLATES.sports },
        { id: 9, name: "Somaroho 2026", artist: "Wawa", description: "Le festival mythique de Nosy Be — culture et musique.", emoji: "💃", category: "festival", date_start: "2026-08-15", venue: "Nosy Be", city: "Nosy Be", image_url: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800", capacity: 30000, tickets_sold: 22000, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 10, name: "Francis Turbo Solo", artist: "Francis Turbo", description: "Humour décapant — one man show.", emoji: "🎤", category: "humour", date_start: "2026-03-30", venue: "Palais des Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1541533232361-9c3f0f70e9a5?w=800", capacity: 6000, tickets_sold: 5800, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 11, name: "Bodo Diva — Live", artist: "Bodo", description: "La diva de Madagascar fête ses 30 ans de carrière.", emoji: "👗", category: "concerts", date_start: "2026-05-10", venue: "Palais des Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800", capacity: 6000, tickets_sold: 4500, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 12, name: "AmbondronA Rock", artist: "AmbondronA", description: "Le groupe de rock n°1 de Madagascar en plein air.", emoji: "🤘", category: "concerts", date_start: "2026-09-05", venue: "Antsonjombe", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800", capacity: 50000, tickets_sold: 35000, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 13, name: "Jazz à l'AFT", artist: "Jazz Collective MG", description: "Le renouveau du jazz malgache dans un cadre intimiste.", emoji: "🎷", category: "concerts", date_start: "2026-10-01", venue: "Jardin AFT", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800", capacity: 1500, tickets_sold: 900, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 14, name: "Rugby: Gasy vs Namibie", artist: "Makis de Madagascar", description: "Qualificatif pour la Coupe du Monde 2027.", emoji: "🏉", category: "sports", date_start: "2026-06-12", venue: "Stade Barea", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800", capacity: 40000, tickets_sold: 21000, status: "active", zones: ZONE_TEMPLATES.sports },
        { id: 15, name: "Rossy en Fête", artist: "Rossy", description: "L'Avaradrano célèbre avec le roi de l'Hira Gasy.", emoji: "🎶", category: "concerts", date_start: "2026-04-10", venue: "Antsonjombe", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800", capacity: 40000, tickets_sold: 30000, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 16, name: "Fiera Mada Expo", artist: "Exposants", description: "Grande foire économique et commerciale.", emoji: "💼", category: "exhibition", date_start: "2026-06-01", venue: "Forello", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800", capacity: 10000, tickets_sold: 4000, status: "active", zones: ZONE_TEMPLATES.exhibition },
        { id: 17, name: "Night with Rim-Ka", artist: "Rim-Ka", description: "Le rap malgache à son sommet.", emoji: "🧢", category: "concerts", date_start: "2026-07-15", venue: "Palladium", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800", capacity: 1000, tickets_sold: 600, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 18, name: "Théâtre: Akory Iny !", artist: "Dago Théâtre", description: "Comédie satirique qui fait rire tout Tana.", emoji: "🎭", category: "theatre", date_start: "2026-09-20", venue: "AFT", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800", capacity: 500, tickets_sold: 300, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 19, name: "Beach Party Foulpointe", artist: "DJ Rolly", description: "Pool & Beach party on the coast.", emoji: "🏖️", category: "festival", date_start: "2026-08-30", venue: "La Plage", city: "Toamasina", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", capacity: 2000, tickets_sold: 1500, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 20, name: "Zamba Gospel Celebration", artist: "Chœur Zamba", description: "Une nuit de louange et de musique gospel.", emoji: "🙏", category: "concerts", date_start: "2026-05-30", venue: "Ekar Antanimena", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800", capacity: 1200, tickets_sold: 1000, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 21, name: "Mr Sayda — M'lay Be", artist: "Mr Sayda", description: "Concert intimiste du rappeur n°1.", emoji: "🎙️", category: "concerts", date_start: "2026-05-02", venue: "IFM", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800", capacity: 600, tickets_sold: 550, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 22, name: "Rock Revival", artist: "Gasy Rocks", description: "Les années 70 revisitées en mode rock gasy.", emoji: "🎸", category: "concerts", date_start: "2026-11-20", venue: "Piment Café", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800", capacity: 200, tickets_sold: 150, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 23, name: "Marathon de Tana", artist: "Athlètes", description: "La course des mille collines — 42km.", emoji: "🏃", category: "sports", date_start: "2026-10-25", venue: "Analakely", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=800", capacity: 5000, tickets_sold: 3000, status: "active", zones: ZONE_TEMPLATES.sports },
        { id: 24, name: "Fashion Show 26", artist: "Stylistes Mada", description: "Défilé haute couture malgache.", emoji: "👗", category: "theatre", date_start: "2026-04-15", venue: "Carlton", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800", capacity: 500, tickets_sold: 450, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 25, name: "Opera: Traviata", artist: "Chœur Gasy", description: "Opéra classique revisité au Palais.", emoji: "🎼", category: "theatre", date_start: "2026-03-12", venue: "Palais d'Ambohimanga", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800", capacity: 300, tickets_sold: 250, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 26, name: "Electro Night", artist: "Digital Team", description: "Best DJs of the Island.", emoji: "🎧", category: "concerts", date_start: "2026-02-14", venue: "Le Six", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800", capacity: 800, tickets_sold: 700, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 27, name: "Loko Gasy 26", artist: "Groupes Locaux", description: "Saveurs et traditions malgaches.", emoji: "🎨", category: "festival", date_start: "2026-05-05", venue: "Coliseum", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", capacity: 50000, tickets_sold: 20000, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 28, name: "Rallye National", artist: "Pilotes Mada", description: "Sensations fortes sur les pistes rouges.", emoji: "🏎️", category: "sports", date_start: "2026-11-12", venue: "Tana Pistes", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?w=800", capacity: 10000, tickets_sold: 5000, status: "active", zones: ZONE_TEMPLATES.sports },
        { id: 29, name: "Samoela 25 ans", artist: "Samoela", description: "Le boss de la variété malgache fête 25 ans.", emoji: "🎙️", category: "concerts", date_start: "2026-12-25", venue: "Stade Barea", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800", capacity: 40000, tickets_sold: 35000, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 30, name: "Fête de la Baleine", artist: "Sainte Marie", description: "Admirez les baleines à bosse dans leur habitat.", emoji: "🐋", category: "festival", date_start: "2026-09-10", venue: "Port-Sainte-Marie", city: "Toamasina", image_url: "https://images.unsplash.com/photo-1550965316-28956973e4de?w=800", capacity: 5000, tickets_sold: 2500, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 31, name: "Art Contemporain", artist: "Peintres Malgaches", description: "Exhibition d'art moderne et contemporain.", emoji: "🖼️", category: "exhibition", date_start: "2026-02-20", venue: "Maison Culture", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800", capacity: 2000, tickets_sold: 400, status: "active", zones: ZONE_TEMPLATES.exhibition },
        { id: 32, name: "DJ Seth World Tour", artist: "DJ Seth", description: "La légende de la nuit arrive à Tana.", emoji: "📀", category: "concerts", date_start: "2026-06-20", venue: "Mojo", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800", capacity: 500, tickets_sold: 450, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 33, name: "Fou Hehy Team Live", artist: "Fou Hehy", description: "Le retour du duo mythique de l'humour malgache.", emoji: "😆", category: "humour", date_start: "2026-10-30", venue: "CCEsca", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1527224857853-eb3dc505f778?w=800", capacity: 1000, tickets_sold: 900, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 34, name: "Salegy Majunga", artist: "Artistes Locaux", description: "Ambiance tropicale garantie sur la côte ouest.", emoji: "💃", category: "concerts", date_start: "2026-07-12", venue: "Village Majunga", city: "Mahajanga", image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800", capacity: 2000, tickets_sold: 1500, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 35, name: "Festival Tuléar", artist: "South Group", description: "Musique Tsapiky au bord de l'eau.", emoji: "🌵", category: "festival", date_start: "2026-12-01", venue: "Stade Tuléar", city: "Toliara", image_url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800", capacity: 10000, tickets_sold: 6000, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 36, name: "New Year Bash", artist: "All Stars", description: "Le réveillon géant de Madagascar.", emoji: "🎆", category: "festival", date_start: "2026-12-31", venue: "Palais Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", capacity: 6000, tickets_sold: 5000, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 37, name: "Shyn & Denise Live", artist: "Shyn & Denise", description: "Le duo glamour de Madagascar en concert.", emoji: "💑", category: "concerts", date_start: "2026-11-15", venue: "Palais Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1514320298324-41d40810167d?w=800", capacity: 6000, tickets_sold: 5000, status: "active", zones: ZONE_TEMPLATES.concert },
        { id: 38, name: "Rugby: Finale Coupe", artist: "Finalistes", description: "Le choc des titans du rugby malgache.", emoji: "🏉", category: "sports", date_start: "2026-12-05", venue: "Stade Barea", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1544698310-74ea9d1c8288?w=800", capacity: 40000, tickets_sold: 38000, status: "active", zones: ZONE_TEMPLATES.sports },
        { id: 39, name: "Exposition Artisanale", artist: "Madagascar Crafts", description: "Le meilleur de l'artisanat local.", emoji: "🧶", category: "exhibition", date_start: "2026-08-01", venue: "Avenue Independance", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800", capacity: 5000, tickets_sold: 1000, status: "active", zones: ZONE_TEMPLATES.exhibition },
        { id: 40, name: "Basket: Play-offs", artist: "Elite Team", description: "La finale du championnat national de basketball.", emoji: "🏀", category: "sports", date_start: "2026-10-10", venue: "Palais Sports", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800", capacity: 6000, tickets_sold: 5500, status: "active", zones: ZONE_TEMPLATES.sports },
        { id: 41, name: "Gasy Gourmet Festival", artist: "Chefs Malgaches", description: "Le meilleur de la gastronomie malgache.", emoji: "🍲", category: "festival", date_start: "2026-06-25", venue: "Jardin Mahamasina", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800", capacity: 3000, tickets_sold: 1500, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 42, name: "Madagascar Tech Summit", artist: "Tech Leaders", description: "Le futur du numérique à Madagascar.", emoji: "💻", category: "exhibition", date_start: "2026-11-05", venue: "CCI Ivato", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800", capacity: 2000, tickets_sold: 800, status: "active", zones: ZONE_TEMPLATES.exhibition },
        { id: 43, name: "Soirée R&B Mada", artist: "R&B Collective", description: "Les voix suaves de Madagascar.", emoji: "🎵", category: "concerts", date_start: "2026-07-05", time: "20:00", venue: "Blue Note Tana", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800", capacity: 400, tickets_sold: 350, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 44, name: "Trail des Lémuriens", artist: "Coureurs", description: "Ultra-trail dans la forêt tropicale d'Andasibe.", emoji: "🦎", category: "sports", date_start: "2026-09-28", venue: "Andasibe", city: "Moramanga", image_url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800", capacity: 1000, tickets_sold: 800, status: "active", zones: ZONE_TEMPLATES.sports },
        { id: 45, name: "Comedy Night Majunga", artist: "Stand-Up MG", description: "Le meilleur de l'humour côtier.", emoji: "🤣", category: "humour", date_start: "2026-06-08", venue: "Hôtel de la Plage", city: "Mahajanga", image_url: "https://images.unsplash.com/photo-1527224857853-eb3dc505f778?w=800", capacity: 300, tickets_sold: 280, status: "active", zones: ZONE_TEMPLATES.theatre },
        { id: 46, name: "Tana Jazz Festival", artist: "Jazz Artists", description: "3 jours de jazz non-stop à l'Hôtel Colbert.", emoji: "🎺", category: "festival", date_start: "2026-10-15", time: "17:00", venue: "Hôtel Colbert", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800", capacity: 2000, tickets_sold: 1200, status: "active", zones: ZONE_TEMPLATES.festival },
        { id: 47, name: "Moraingy Championship", artist: "Fighters", description: "Le combat traditionnel malgache — finale nationale.", emoji: "🥊", category: "sports", date_start: "2026-08-22", venue: "Place du Zoma", city: "Toliara", image_url: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800", capacity: 5000, tickets_sold: 4500, status: "active", hot: true, zones: ZONE_TEMPLATES.sports },
        { id: 48, name: "Cinéma en Plein Air", artist: "Films Malgaches", description: "Projection de films locaux au bord du lac.", emoji: "🎬", category: "theatre", date_start: "2026-07-25", venue: "Lac Anosy", city: "Antananarivo", image_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800", capacity: 1500, tickets_sold: 600, status: "active", zones: ZONE_TEMPLATES.theatre }
    ];

    const MOCK_EVENTS_FINAL = MOCK_EVENTS.map(e => ({
        ...e,
        image_url: (e.image_url && e.image_url.trim() !== "") ? e.image_url : (CATEGORY_PLACEHOLDERS[e.category] || CATEGORY_PLACEHOLDERS.default)
    }));

    const MockAPI = {
        getEvents(filters = {}) {
            let events = [...MOCK_EVENTS_FINAL];
            if (filters.search) {
                const q = filters.search.toLowerCase();
                events = events.filter(e => e.name.toLowerCase().includes(q) || (e.artist && e.artist.toLowerCase().includes(q)));
            }
            return { events, total: events.length };
        },
        getEvent(id) { 
            const e = MOCK_EVENTS_FINAL.find(ev => ev.id == id);
            return e ? { event: e } : { error: 'Not found' };
        },
        searchEvents(query) { return this.getEvents({ search: query }); },
        getEventSeats(id) {
            const e = this.getEvent(id).event;
            if (!e) return { zones: [] };
            return {
                id: e.id,
                capacity: e.capacity,
                zones: e.zones.map(z => ({
                    ...z,
                    sold: Math.floor(Math.random() * (z.rows || 5) * (z.seatsPerRow || 20))
                }))
            };
        },
        getRelatedEvents(id) {
            return { events: MOCK_EVENTS_FINAL.filter(e => e.id != id).slice(0, 3) };
        },
        getArtist(name) {
            const events = MOCK_EVENTS_FINAL.filter(e => e.artist.toLowerCase().includes(name.toLowerCase()));
            return { artist: { name, bio: "Artiste malgache." }, events };
        },
        setPriceAlert(data) {
            const alerts = JSON.parse(localStorage.getItem('ticketmada_alerts') || '[]');
            alerts.push({ ...data, id: Date.now(), active: true, created_at: new Date().toISOString() });
            localStorage.setItem('ticketmada_alerts', JSON.stringify(alerts));
            return { success: true };
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
                const url = this.baseUrl + (path.startsWith('http') ? '' : (path.startsWith('/api') ? path : '/api' + path));
                // Basic cleanup of double slashes (except in protocol)
                const finalUrl = url.replace(/([^:])\/\//g, '$1/');
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
                
                const res = await fetch(finalUrl, { ...opts, signal: controller.signal });
                clearTimeout(timeoutId);
                
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
            if (token) localStorage.setItem('ticketmada_token', token);
            else localStorage.removeItem('ticketmada_token');
            
            if (user) {
                if (user.email === 'sedrayiokoraz@gmail.com') user.role = 'superadmin';
                localStorage.setItem('ticketmada_user', JSON.stringify(user));
            } else {
                localStorage.removeItem('ticketmada_user');
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
            if (u && u.email === 'sedrayiokoraz@gmail.com') return 'superadmin';
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

        async get(path) {
            console.log('[SmartAPI] GET', path);
            const isEventPath = path.includes('/events') || path.includes('/search') || path.includes('/artists/');
            
            if (this.useMock) {
                if (path === '/auth/me') {
                    const u = this.getUser();
                    if (u) return { success: true, user: u };
                    return { success: false, error: 'Not logged in' };
                }
                // Dashboard organizer mock routes
                if (path === '/dashboard' || path === '/organizer/dashboard' || path.includes('/stats')) {
                    return { 
                        success: true, 
                        events: MockAPI.getEvents().events.slice(0, 5),
                        stats: { totalRevenue: 12500000, ticketsSold: 456, activeEvents: 5, conversionRate: 3.2 }, 
                        recentOrders: [], 
                        recentActivity: [] 
                    };
                }
                if (path === '/orders' || path.startsWith('/organizer/orders')) {
                    return { success: true, orders: [] };
                }
                if (path === '/tickets' || path.startsWith('/organizer/tickets')) {
                    return { success: true, tickets: [] };
                }
                if (path.startsWith('/organizer/payouts') || path.includes('/payouts')) {
                    return { success: true, payouts: [] };
                }
                if (path.startsWith('/organizer/team') || path.includes('/team')) {
                    return { success: true, members: [] };
                }
                if (path.startsWith('/scan') || path.includes('/scanner')) {
                    return { success: true, data: [], links: [] };
                }
                if (path.startsWith('/superadmin/')) {
                    return { success: true, data: [] };
                }
                if (path.includes('/promo') || path.includes('/marketing')) {
                    return { success: true, promoCodes: [] };
                }
                if (path.includes('/attendee') || path.includes('/checkin')) {
                    return { success: true, attendees: [], checkinLists: [] };
                }

                if (isEventPath) {
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
                }
            }

            // Local status/auth fallback when using mock mode
            if (this.useMock) {
                if (path.includes('/auth/status')) return { loggedIn: this.isLoggedIn(), user: this.getUser() };
                if (path.includes('/auth/me')) {
                    const u = this.getUser();
                    if (u) return { user: u };
                    throw { status: 401, error: 'Not logged in' };
                }
                
                // Fallback for any unknown route in mock
                console.warn('[SmartAPI] No specific mock route for:', path);
                return { success: true, data: [] };
            }

            return this.real.get(path);
        }

        /**
         * Generic POST method
         */
        async post(path, data) {
            console.log('[SmartAPI] POST', path, data);
            
            // Whitelist for mock POST allowed (e.g. static search/filter/price-alerts)
            const isMockAllowed = path.includes('/price-alerts');

            if (this.useMock && isMockAllowed) {
                if (path.includes('/price-alerts')) return MockAPI.setPriceAlert(data);
                return { success: true };
            }
            return this.real.post(path, data);
        }

        async put(path, data) {
            console.log('[SmartAPI] PUT', path, data);
            return this.real.put(path, data);
        }

        // --- Shared state ---
        getUser() {
            const user = localStorage.getItem('ticketmada_user');
            return user ? JSON.parse(user) : null;
        }

        async logout() {
            console.log('[SmartAPI] logout() called');
            
            // 1. Déconnecter de Google
            if (typeof GoogleAuth !== 'undefined') {
                GoogleAuth.signOut();
            }

            // 2. Nettoyer localStorage
            try {
                localStorage.removeItem('ticketmada_token');
                localStorage.removeItem('ticketmada_user');
                localStorage.removeItem('ticketmada_device_id');
            } catch(e) {}

            // 3. Notifier le backend (si disponible)
            if (!this.useMock) {
                try {
                    await this.real.post('/auth/logout', {});
                } catch(e) {
                    console.warn('[SmartAPI] Backend logout failed:', e.message);
                }
            }

            console.log('[SmartAPI] Logout complete');
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
            console.log('[SmartAPI] login attempt for:', data.email);
            
            try {
                result = await this.real.post('/api/auth/login', data);
                console.log('[SmartAPI] Real Login Result:', result);
            } catch (e) {
                console.error('[SmartAPI] Real Login Failed:', e);
                throw e; // No fallback to mock as per "real-only" requirement
            }
            
            if (result && result.success) {
                this.setAuth(result.token, result.user);
            }
            return result; 
        }
        
        async loginWithGoogle() {
            console.log('[SmartAPI] loginWithGoogle() started');
            
            try {
                if (typeof GoogleAuth === 'undefined') {
                    console.error('[SmartAPI] GoogleAuth helper missing!');
                    throw new Error('Le module d\'authentification Google n\'est pas chargé.');
                }

                console.log('[SmartAPI] Awaiting GoogleAuth.signIn()...');
                const user = await GoogleAuth.signIn();
                console.log('[SmartAPI] GoogleAuth.signIn() resolved for:', user?.email);

                if (!user || !user.email) {
                    throw new Error('Aucune information utilisateur reçue de Google.');
                }

                // Flush immediately to localStorage
                try {
                    localStorage.setItem('ticketmada_token', user.token);
                    localStorage.setItem('ticketmada_user', JSON.stringify(user));
                    console.log('[SmartAPI] Local storage updated');
                } catch(e) {
                    console.warn('[SmartAPI] LocalStorage error:', e);
                }

                let role = 'buyer';
                let backendUser = null;

                // Sync with backend with its own timeout
                if (!this.useMock) {
                    console.log('[SmartAPI] Syncing with backend...');
                    try {
                        const syncResult = await this.real.post('/api/auth/oauth', {
                            token: user.token,
                            email: user.email,
                            name: user.name,
                            picture: user.picture,
                            provider: 'google',
                            google_id: user.id
                        });
                        console.log('[SmartAPI] Backend sync result:', syncResult);
                        if (syncResult && syncResult.success && syncResult.user) {
                            backendUser = syncResult.user;
                            role = syncResult.user.role || role;
                        }
                    } catch (e) {
                        console.warn('[SmartAPI] Backend sync skipped/failed:', e.message);
                    }
                }

                // SuperAdmin override
                if (user.email === 'sedrayiokoraz@gmail.com') {
                    console.log('[SmartAPI] SuperAdmin identity detected');
                    role = 'superadmin';
                }

                const result = {
                    success: true,
                    user: {
                        id: backendUser?.id || user.id,
                        email: user.email,
                        name: user.name,
                        picture: user.picture,
                        photo: user.picture,
                        role: backendUser?.role || role,
                        provider: 'google'
                    }
                };

                // Update RealAPI context
                this.real.setAuth(user.token, result.user);
                
                console.log('[SmartAPI] loginWithGoogle success final:', result.user.email, 'role:', result.user.role);
                return result;

            } catch (e) {
                console.error('[SmartAPI] loginWithGoogle caught error:', e);
                return { 
                    success: false, 
                    error: e.message || 'Erreur lors de la connexion Google'
                };
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
