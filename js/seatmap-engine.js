// TicketMada Seatmap Engine - Advanced Venue Layout Generator
// Professional-grade seatmap engine with realistic venue templates and SVG previews
// Supports diverse venue shapes: theaters, cinemas, arenas, opera houses, festivals, and more

window.SeatmapEngine = {

    templates: [
        {
            id: 'theater',
            name: 'Théâtre classique',
            description: 'Scène frontale, rangées courbes avec allée centrale',
            icon: '🎭',
            capacity: 280,
            zones: 4,
            config: {
                rows: 14,
                cols: 20,
                stageType: 'front-small',
                curved: true,
                curveStrength: 1.5,
                aisles: [9, 10],
                sections: 1,
                arcCut: false,
                pitRows: 0
            }
        },
        {
            id: 'cinema',
            name: 'Salle de cinéma',
            description: 'Rangées progressivement courbes, écran large incurvé',
            icon: '🎬',
            capacity: 320,
            zones: 4,
            config: {
                rows: 16,
                cols: 24,
                stageType: 'screen',
                curved: true,
                curveStrength: 2.5,
                aisles: [7, 16],
                sections: 1,
                arcCut: false,
                pitRows: 0
            }
        },
        {
            id: 'coliseum',
            name: 'Colisée / Amphithéâtre',
            description: 'Demi-cercle autour de la scène, gradins en arc progressif',
            icon: '🏛️',
            capacity: 380,
            zones: 4,
            config: {
                rows: 14,
                cols: 28,
                stageType: 'semicircle',
                curved: true,
                curveStrength: 4,
                aisles: [13, 14],
                sections: 1,
                arcCut: true,
                pitRows: 0
            }
        },
        {
            id: 'center-stage',
            name: 'Scène centrale (360°)',
            description: 'Scène au milieu, public sur 4 côtés, zones distinctes',
            icon: '🎪',
            capacity: 400,
            zones: 4,
            config: {
                rows: 8,
                cols: 12,
                stageType: 'center',
                curved: false,
                aisles: [],
                sections: 4,
                gap: 5,
                stageDim: 60,
                pitRows: 0
            }
        },
        {
            id: 'stadium',
            name: 'Stade / Grand événement',
            description: 'Grandes tribunes rectangulaires, capacité massive',
            icon: '🏟️',
            capacity: 600,
            zones: 4,
            config: {
                rows: 18,
                cols: 36,
                stageType: 'front-wide',
                curved: true,
                curveStrength: 1,
                aisles: [11, 23],
                sections: 3,
                arcCut: false,
                pitRows: 0
            }
        },
        {
            id: 'conference',
            name: 'Salle de conférence',
            description: 'Rangées droites compactes, allées latérales bien définies',
            icon: '🎤',
            capacity: 150,
            zones: 3,
            config: {
                rows: 12,
                cols: 14,
                stageType: 'podium',
                curved: false,
                aisles: [6, 7],
                sections: 1,
                arcCut: false,
                pitRows: 0
            }
        },
        {
            id: 'cabaret',
            name: 'Cabaret / Tables rondes',
            description: 'Tables circulaires avec chaises, disposition face à la scène',
            icon: '🍷',
            capacity: 120,
            zones: 3,
            config: {
                rows: 6,
                cols: 8,
                stageType: 'front-small',
                curved: false,
                aisles: [],
                sections: 1,
                tableMode: true,
                seatsPerTable: 8,
                pitRows: 0
            }
        },
        {
            id: 'arena',
            name: 'Arène / Concert',
            description: 'Fosse debout devant, gradins assis avec courbe douce',
            icon: '🎸',
            capacity: 480,
            zones: 5,
            config: {
                rows: 16,
                cols: 26,
                stageType: 'front-wide',
                curved: true,
                curveStrength: 2,
                aisles: [8, 16],
                sections: 1,
                arcCut: false,
                pitRows: 4
            }
        },
        {
            id: 'opera-house',
            name: 'Opéra / Théâtre en fer à cheval',
            description: 'Balcon en U autour de la scène, multiple étages',
            icon: '🎨',
            capacity: 450,
            zones: 5,
            config: {
                rows: 12,
                cols: 22,
                stageType: 'front-small',
                curved: true,
                curveStrength: 3,
                aisles: [10, 11],
                sections: 1,
                arcCut: true,
                operaMode: true,
                pitRows: 0
            }
        },
        {
            id: 'festival',
            name: 'Festival / Événement en plein air',
            description: 'Plusieurs sections séparées, disposition modulable',
            icon: '🎉',
            capacity: 500,
            zones: 4,
            config: {
                rows: 10,
                cols: 20,
                stageType: 'front-wide',
                curved: false,
                aisles: [],
                sections: 4,
                festivalMode: true,
                gap: 8,
                pitRows: 0
            }
        }
    ],

    defaultZones: [
        { id: 'vip', name: 'VIP', color: '#FF6B4A', price: 150000 },
        { id: 'premium', name: 'Premium', color: '#FECA57', price: 80000 },
        { id: 'standard', name: 'Standard', color: '#4A90FF', price: 40000 },
        { id: 'eco', name: 'Économique', color: '#00D9A5', price: 20000 },
        { id: 'pit', name: 'Fosse/Debout', color: '#9B59B6', price: 60000 }
    ],

    // Generate seats for a template with realistic shapes
    generate(templateId) {
        const tpl = this.templates.find(t => t.id === templateId);
        if (!tpl) return null;
        const cfg = tpl.config;

        // Special generation modes
        if (cfg.stageType === 'center') {
            return this._generateCenterStage(cfg);
        }
        if (cfg.tableMode) {
            return this._generateCabaret(cfg);
        }
        if (cfg.festivalMode) {
            return this._generateFestival(cfg);
        }
        if (cfg.operaMode) {
            return this._generateOpera(cfg);
        }

        // Standard seated layout with arc cut support
        const seats = [];
        const rows = cfg.rows;
        const cols = cfg.cols;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const seat = {
                    row: r,
                    col: c,
                    zone: null,
                    visible: true,
                    label: String.fromCharCode(65 + r) + (c + 1),
                    standing: false,
                    isTable: false
                };

                // Aisles - vertical separation columns
                if (cfg.aisles && cfg.aisles.includes(c)) {
                    seat.zone = 'aisle';
                    seats.push(seat);
                    continue;
                }

                // Arc cut for semicircular/amphitheater venues - hides corner seats
                if (cfg.arcCut) {
                    const centerCol = cols / 2;
                    const distFromCenter = Math.abs(c - centerCol);
                    // Progressive narrowing from stage to back
                    const maxAllowedDist = centerCol - (r * 0.75);
                    if (distFromCenter > maxAllowedDist) {
                        seat.visible = false;
                        seats.push(seat);
                        continue;
                    }
                }

                // Pit rows - standing area for concerts/arenas
                if (cfg.pitRows && r < cfg.pitRows) {
                    seat.zone = 'pit';
                    seat.standing = true;
                    seats.push(seat);
                    continue;
                }

                // Zone assignment based on row distance from stage
                const effectiveRow = cfg.pitRows ? r - cfg.pitRows : r;
                const totalEffectiveRows = cfg.pitRows ? rows - cfg.pitRows : rows;
                const distanceFromStage = effectiveRow / totalEffectiveRows;

                if (distanceFromStage < 0.18) {
                    seat.zone = 'vip';
                } else if (distanceFromStage < 0.4) {
                    seat.zone = 'premium';
                } else if (distanceFromStage < 0.75) {
                    seat.zone = 'standard';
                } else {
                    seat.zone = 'eco';
                }

                seats.push(seat);
            }
        }

        return {
            seats,
            rows,
            cols,
            stageType: cfg.stageType,
            curved: cfg.curved,
            curveStrength: cfg.curveStrength || 0,
            config: cfg
        };
    },

    // Center stage: 4 rectangular blocks around a central stage
    _generateCenterStage(cfg) {
        const seats = [];
        const blockRows = cfg.rows;
        const blockCols = cfg.cols;
        const gap = cfg.gap || 5;
        const totalRows = blockRows * 2 + gap;
        const totalCols = blockCols * 2 + gap;

        // 4 blocks positioned around center stage
        const blocks = [
            { startR: 0, startC: Math.floor((totalCols - blockCols) / 2), label: 'N', zone: 'vip' },
            { startR: totalRows - blockRows, startC: Math.floor((totalCols - blockCols) / 2), label: 'S', zone: 'standard' },
            { startR: Math.floor((totalRows - blockRows) / 2), startC: 0, label: 'W', zone: 'premium' },
            { startR: Math.floor((totalRows - blockRows) / 2), startC: totalCols - blockCols, label: 'E', zone: 'eco' }
        ];

        // Initialize grid with invisible seats
        for (let r = 0; r < totalRows; r++) {
            for (let c = 0; c < totalCols; c++) {
                seats.push({
                    row: r,
                    col: c,
                    zone: null,
                    visible: false,
                    label: '',
                    standing: false,
                    isTable: false
                });
            }
        }

        // Place seat blocks
        blocks.forEach((block, blockIndex) => {
            for (let r = 0; r < blockRows; r++) {
                for (let c = 0; c < blockCols; c++) {
                    const gridRow = block.startR + r;
                    const gridCol = block.startC + c;
                    const seatIndex = gridRow * totalCols + gridCol;

                    if (seatIndex < seats.length) {
                        seats[seatIndex].visible = true;
                        seats[seatIndex].zone = block.zone;
                        seats[seatIndex].label = block.label + String.fromCharCode(65 + r) + (c + 1);
                    }
                }
            }
        });

        return {
            seats,
            rows: totalRows,
            cols: totalCols,
            stageType: 'center',
            curved: false,
            curveStrength: 0,
            config: cfg
        };
    },

    // Cabaret mode: circular tables with chairs around them
    _generateCabaret(cfg) {
        const seats = [];
        const rows = cfg.rows;
        const cols = cfg.cols;
        const seatsPerTable = cfg.seatsPerTable || 8;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const seat = {
                    row: r,
                    col: c,
                    zone: null,
                    visible: true,
                    label: 'T' + (r + 1) + '-C' + (c + 1),
                    standing: false,
                    isTable: true
                };

                // Create gaps for table spacing (every 2-3 positions)
                if (r % 2 === 1 || c % 3 === 2) {
                    seat.visible = false;
                } else {
                    // Assign zones based on proximity to stage (closer = better)
                    const proximity = r / rows;
                    if (proximity < 0.25) {
                        seat.zone = 'vip';
                    } else if (proximity < 0.5) {
                        seat.zone = 'premium';
                    } else if (proximity < 0.75) {
                        seat.zone = 'standard';
                    } else {
                        seat.zone = 'eco';
                    }
                }

                seats.push(seat);
            }
        }

        return {
            seats,
            rows,
            cols,
            stageType: 'front-small',
            curved: false,
            curveStrength: 0,
            config: cfg,
            tableMode: true
        };
    },

    // Festival mode: multiple separated sections
    _generateFestival(cfg) {
        const seats = [];
        const blockRows = cfg.rows;
        const blockCols = cfg.cols;
        const gap = cfg.gap || 8;
        const numSections = cfg.sections || 4;

        // Calculate grid dimensions (2x2 grid for 4 sections)
        const gridRows = 2;
        const gridCols = numSections === 4 ? 2 : numSections === 3 ? 3 : 1;
        const totalRows = blockRows * gridRows + gap * (gridRows - 1);
        const totalCols = blockCols * gridCols + gap * (gridCols - 1);

        // Initialize invisible grid
        for (let r = 0; r < totalRows; r++) {
            for (let c = 0; c < totalCols; c++) {
                seats.push({
                    row: r,
                    col: c,
                    zone: null,
                    visible: false,
                    label: '',
                    standing: false,
                    isTable: false
                });
            }
        }

        // Place sections
        const zones = ['vip', 'premium', 'standard', 'eco'];
        let sectionIndex = 0;

        for (let sr = 0; sr < gridRows; sr++) {
            for (let sc = 0; sc < gridCols; sc++) {
                if (sectionIndex >= numSections) break;

                const startR = sr * (blockRows + gap);
                const startC = sc * (blockCols + gap);
                const zoneAssign = zones[sectionIndex % zones.length];

                for (let r = 0; r < blockRows; r++) {
                    for (let c = 0; c < blockCols; c++) {
                        const gr = startR + r;
                        const gc = startC + c;
                        const idx = gr * totalCols + gc;

                        if (idx < seats.length && gr < totalRows && gc < totalCols) {
                            seats[idx].visible = true;
                            seats[idx].zone = zoneAssign;
                            seats[idx].label = 'S' + (sectionIndex + 1) + String.fromCharCode(65 + r) + (c + 1);
                        }
                    }
                }

                sectionIndex++;
            }
        }

        return {
            seats,
            rows: totalRows,
            cols: totalCols,
            stageType: 'front-wide',
            curved: false,
            curveStrength: 0,
            config: cfg,
            festivalMode: true
        };
    },

    // Opera house: U-shaped (horseshoe) balcony layout
    _generateOpera(cfg) {
        const seats = [];
        const rows = cfg.rows;
        const cols = cfg.cols;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const seat = {
                    row: r,
                    col: c,
                    zone: null,
                    visible: true,
                    label: String.fromCharCode(65 + r) + (c + 1),
                    standing: false,
                    isTable: false
                };

                // Aisles
                if (cfg.aisles && cfg.aisles.includes(c)) {
                    seat.zone = 'aisle';
                    seats.push(seat);
                    continue;
                }

                // Create horseshoe shape: hide sides at back, progressively open forward
                const centerCol = cols / 2;
                const distFromCenter = Math.abs(c - centerCol);
                // Horseshoe shape: allow wider seating in front, narrower in back
                const maxWidth = centerCol - (r * 0.5);
                if (distFromCenter > maxWidth) {
                    seat.visible = false;
                    seats.push(seat);
                    continue;
                }

                // Zone assignment
                const proximity = r / rows;
                if (proximity < 0.15) {
                    seat.zone = 'vip';
                } else if (proximity < 0.35) {
                    seat.zone = 'premium';
                } else if (proximity < 0.65) {
                    seat.zone = 'standard';
                } else if (proximity < 0.85) {
                    seat.zone = 'eco';
                } else {
                    seat.zone = 'eco'; // Back balcony
                }

                seats.push(seat);
            }
        }

        return {
            seats,
            rows,
            cols,
            stageType: 'front-small',
            curved: true,
            curveStrength: 3,
            config: cfg,
            operaMode: true
        };
    },

    // Get CSS transform for curved rows - creates realistic curved venue effect
    getRowTransform(rowIndex, totalRows, curveStrength, totalCols) {
        if (!curveStrength || curveStrength === 0) return '';

        // Calculate indentation and gap based on row position
        const progress = rowIndex / Math.max(totalRows - 1, 1);
        const indent = Math.round(curveStrength * progress * progress * 15);
        const gapSize = Math.round(2 + progress * 2.5);
        const perspective = Math.round(100 - progress * 30);

        return `padding-left:${indent}px;padding-right:${indent}px;gap:${gapSize}px;`;
    },

    // Generate professional SVG preview for template selection cards
    getPreviewSVG(templateId) {
        const tpl = this.templates.find(t => t.id === templateId);
        if (!tpl) return '';
        const cfg = tpl.config;

        // Special SVGs for special layouts
        if (cfg.stageType === 'center') {
            return this._generateCenterStageSVG();
        }
        if (cfg.tableMode) {
            return this._generateCabaretSVG();
        }
        if (cfg.festivalMode) {
            return this._generateFestivalSVG();
        }
        if (cfg.operaMode) {
            return this._generateOperaSVG();
        }

        // Standard layout SVG
        return this._generateStandardSVG(cfg);
    },

    // SVG for center stage layout
    _generateCenterStageSVG() {
        const defs = `
            <defs>
                <linearGradient id="stageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#000;stop-opacity:1" />
                </linearGradient>
                <filter id="stageShadow">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                </filter>
            </defs>
        `;

        const svg = `<svg viewBox="0 0 220 220" width="200" height="200">
            ${defs}
            <rect x="0" y="0" width="220" height="220" fill="#f5f5f5"/>

            <!-- Center stage -->
            <rect x="75" y="75" width="70" height="70" rx="8" fill="url(#stageGrad)" filter="url(#stageShadow)"/>
            <text x="110" y="115" text-anchor="middle" fill="white" font-size="11" font-weight="bold">STAGE</text>

            <!-- North block (VIP) -->
            <rect x="45" y="5" width="130" height="55" rx="4" fill="#f0f0f0" stroke="#ddd" stroke-width="1"/>
            <g fill="#FF6B4A" opacity="0.8">
                ${this._generateSeatPattern(55, 15, 110, 35, 10, 4, 0.8)}
            </g>
            <text x="110" y="50" text-anchor="middle" fill="#333" font-size="9" font-weight="bold">VIP</text>

            <!-- South block (Standard) -->
            <rect x="45" y="160" width="130" height="55" rx="4" fill="#f0f0f0" stroke="#ddd" stroke-width="1"/>
            <g fill="#4A90FF" opacity="0.8">
                ${this._generateSeatPattern(55, 170, 110, 35, 10, 4, 0.8)}
            </g>
            <text x="110" y="205" text-anchor="middle" fill="#333" font-size="9" font-weight="bold">STD</text>

            <!-- West block (Premium) -->
            <rect x="5" y="45" width="55" height="130" rx="4" fill="#f0f0f0" stroke="#ddd" stroke-width="1"/>
            <g fill="#FECA57" opacity="0.8">
                ${this._generateSeatPattern(15, 55, 35, 110, 4, 10, 0.8)}
            </g>
            <text x="30" y="115" text-anchor="middle" fill="#333" font-size="9" font-weight="bold">PRM</text>

            <!-- East block (Eco) -->
            <rect x="160" y="45" width="55" height="130" rx="4" fill="#f0f0f0" stroke="#ddd" stroke-width="1"/>
            <g fill="#00D9A5" opacity="0.8">
                ${this._generateSeatPattern(170, 55, 35, 110, 4, 10, 0.8)}
            </g>
            <text x="185" y="115" text-anchor="middle" fill="#333" font-size="9" font-weight="bold">ECO</text>
        </svg>`;

        return svg;
    },

    // SVG for cabaret layout
    _generateCabaretSVG() {
        const defs = `
            <defs>
                <radialGradient id="tableGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#fff;stop-opacity:0.3" />
                    <stop offset="100%" style="stop-color:#000;stop-opacity:0.1" />
                </radialGradient>
            </defs>
        `;

        let tablesHtml = '';
        const positions = [
            [30, 60], [80, 60], [130, 60], [180, 60],
            [30, 110], [80, 110], [130, 110], [180, 110],
            [30, 160], [80, 160], [130, 160], [180, 160]
        ];

        const colors = ['#FF6B4A', '#FF6B4A', '#FECA57', '#FECA57', '#FECA57', '#4A90FF', '#4A90FF', '#4A90FF', '#4A90FF', '#00D9A5', '#00D9A5', '#00D9A5'];

        positions.forEach((pos, i) => {
            tablesHtml += `
                <circle cx="${pos[0]}" cy="${pos[1]}" r="12" fill="${colors[i]}" fill-opacity="0.7" stroke="#1a1a1a" stroke-width="0.5"/>
                <circle cx="${pos[0]}" cy="${pos[1]}" r="12" fill="url(#tableGrad)"/>
                ${[0, 60, 120, 180, 240, 300].map(angle => {
                    const rad = angle * Math.PI / 180;
                    const px = pos[0] + 6 * Math.cos(rad);
                    const py = pos[1] + 6 * Math.sin(rad);
                    return `<circle cx="${px}" cy="${py}" r="2.5" fill="white" opacity="0.6"/>`;
                }).join('')}
            `;
        });

        return `<svg viewBox="0 0 220 220" width="200" height="200">
            ${defs}
            <rect x="0" y="0" width="220" height="220" fill="#f5f5f5"/>

            <!-- Stage -->
            <rect x="30" y="5" width="160" height="25" rx="12" fill="#1a1a1a"/>
            <text x="110" y="22" text-anchor="middle" fill="white" font-size="10" font-weight="bold">STAGE</text>

            <!-- Tables -->
            ${tablesHtml}
        </svg>`;
    },

    // SVG for festival layout with multiple sections
    _generateFestivalSVG() {
        const defs = `
            <defs>
                <linearGradient id="sectionGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#FF6B4A;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:#FF5238;stop-opacity:0.8" />
                </linearGradient>
                <linearGradient id="sectionGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#FECA57;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:#FEB347;stop-opacity:0.8" />
                </linearGradient>
                <linearGradient id="sectionGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#4A90FF;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:#357ABD;stop-opacity:0.8" />
                </linearGradient>
                <linearGradient id="sectionGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#00D9A5;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:#00BF8C;stop-opacity:0.8" />
                </linearGradient>
            </defs>
        `;

        return `<svg viewBox="0 0 220 220" width="200" height="200">
            ${defs}
            <rect x="0" y="0" width="220" height="220" fill="#f5f5f5"/>

            <!-- Stage -->
            <rect x="40" y="5" width="140" height="20" rx="10" fill="#1a1a1a"/>
            <text x="110" y="18" text-anchor="middle" fill="white" font-size="9" font-weight="bold">STAGE</text>

            <!-- Section 1 (NW) - VIP -->
            <rect x="10" y="35" width="95" height="80" rx="3" fill="url(#sectionGrad1)"/>
            ${this._generateSeatPattern(18, 45, 79, 64, 8, 8, 0.6)}

            <!-- Section 2 (NE) - Premium -->
            <rect x="115" y="35" width="95" height="80" rx="3" fill="url(#sectionGrad2)"/>
            ${this._generateSeatPattern(123, 45, 79, 64, 8, 8, 0.6)}

            <!-- Section 3 (SW) - Standard -->
            <rect x="10" y="125" width="95" height="80" rx="3" fill="url(#sectionGrad3)"/>
            ${this._generateSeatPattern(18, 135, 79, 64, 8, 8, 0.6)}

            <!-- Section 4 (SE) - Eco -->
            <rect x="115" y="125" width="95" height="80" rx="3" fill="url(#sectionGrad4)"/>
            ${this._generateSeatPattern(123, 135, 79, 64, 8, 8, 0.6)}
        </svg>`;
    },

    // SVG for opera house horseshoe layout
    _generateOperaSVG() {
        const defs = `
            <defs>
                <linearGradient id="opGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#FF6B4A;stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:#FF5238;stop-opacity:0.9" />
                </linearGradient>
                <linearGradient id="opGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#FECA57;stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:#FEB347;stop-opacity:0.9" />
                </linearGradient>
                <linearGradient id="opGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#4A90FF;stop-opacity:0.9" />
                    <stop offset="100%" style="stop-color:#357ABD;stop-opacity:0.9" />
                </linearGradient>
            </defs>
        `;

        return `<svg viewBox="0 0 240 200" width="220" height="180">
            ${defs}
            <rect x="0" y="0" width="240" height="200" fill="#f5f5f5"/>

            <!-- Stage -->
            <rect x="70" y="5" width="100" height="25" rx="12" fill="#1a1a1a"/>
            <text x="120" y="22" text-anchor="middle" fill="white" font-size="10" font-weight="bold">STAGE</text>

            <!-- Horseshoe seating - Front Center (VIP) -->
            <path d="M 60 40 L 180 40 Q 185 50 180 55 L 60 55 Q 55 50 60 40" fill="url(#opGrad1)"/>
            ${this._generateSeatPattern(70, 42, 100, 10, 10, 2, 0.7)}

            <!-- Middle section (Premium) -->
            <path d="M 50 60 Q 45 85 50 110 L 190 110 Q 195 85 190 60 Z" fill="url(#opGrad2)"/>
            ${this._generateSeatPattern(65, 72, 80, 30, 6, 4, 0.7)}
            ${this._generateSeatPattern(150, 72, 20, 30, 6, 4, 0.7)}

            <!-- Back section (Standard) -->
            <path d="M 40 120 Q 35 145 40 170 L 200 170 Q 205 145 200 120 Z" fill="url(#opGrad3)"/>
            ${this._generateSeatPattern(60, 135, 60, 25, 5, 3, 0.7)}
            ${this._generateSeatPattern(140, 135, 40, 25, 5, 3, 0.7)}
        </svg>`;
    },

    // SVG for standard theater/cinema layouts
    _generateStandardSVG(cfg) {
        const w = 220;
        const h = 220;

        const defs = `
            <defs>
                <linearGradient id="seatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#fff;stop-opacity:0.2" />
                    <stop offset="100%" style="stop-color:#000;stop-opacity:0.1" />
                </linearGradient>
                <filter id="seatShadow">
                    <feDropShadow dx="0.5" dy="0.5" stdDeviation="1" flood-opacity="0.2"/>
                </filter>
            </defs>
        `;

        let svg = `<svg viewBox="0 0 ${w} ${h}" width="200" height="200">
            ${defs}
            <rect x="0" y="0" width="${w}" height="${h}" fill="#f5f5f5"/>
        `;

        // Stage rendering based on type
        if (cfg.stageType === 'semicircle') {
            svg += `
                <path d="M 30 35 Q 110 5 190 35" fill="none" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/>
                <text x="110" y="25" text-anchor="middle" fill="#1a1a1a" font-size="9" font-weight="bold">STAGE</text>
            `;
        } else if (cfg.stageType === 'screen') {
            svg += `
                <rect x="15" y="5" width="190" height="18" rx="3" fill="#1a1a1a"/>
                <rect x="18" y="8" width="184" height="12" fill="#0a0a0a"/>
                <text x="110" y="17" text-anchor="middle" fill="#888" font-size="8" font-weight="bold">SCREEN</text>
            `;
        } else {
            svg += `
                <rect x="50" y="8" width="120" height="20" rx="10" fill="#1a1a1a"/>
                <text x="110" y="22" text-anchor="middle" fill="white" font-size="9" font-weight="bold">STAGE</text>
            `;
        }

        // Seat grid preview
        const previewRows = Math.min(cfg.rows, 11);
        const previewCols = Math.min(cfg.cols, 16);
        const startY = cfg.stageType === 'semicircle' ? 50 : 35;
        const rowHeight = (h - startY - 10) / previewRows;

        const colors = ['#FF6B4A', '#FF6B4A', '#FECA57', '#FECA57', '#4A90FF', '#4A90FF', '#4A90FF', '#00D9A5', '#00D9A5', '#00D9A5', '#00D9A5'];

        for (let r = 0; r < previewRows; r++) {
            const pct = r / previewRows;
            const curve = cfg.curved ? cfg.curveStrength * pct * pct * 8 : 0;
            const rowY = startY + r * rowHeight;
            const colWidth = (w - 30 - curve * 2) / previewCols;

            // Determine color for this row based on zone logic
            let rowColor = colors[Math.floor(pct * colors.length)];

            for (let c = 0; c < previewCols; c++) {
                // Skip aisles
                if (cfg.aisles && cfg.aisles.includes(Math.floor(c * cfg.cols / previewCols))) {
                    continue;
                }

                const colX = 15 + curve + c * colWidth;

                // Arc cut
                if (cfg.arcCut) {
                    const center = previewCols / 2;
                    const dist = Math.abs(c - center);
                    if (dist > center - r * 0.65) continue;
                }

                // Pit rows
                if (cfg.pitRows && r < Math.floor(cfg.pitRows * previewRows / cfg.rows)) {
                    svg += `<rect x="${colX}" y="${rowY}" width="${colWidth-1}" height="${rowHeight-1}" rx="1" fill="#9B59B6" opacity="0.7" filter="url(#seatShadow)"/>`;
                    continue;
                }

                svg += `<rect x="${colX}" y="${rowY}" width="${colWidth-1}" height="${rowHeight-1}" rx="1.5" fill="${rowColor}" opacity="0.75" stroke="#fff" stroke-width="0.3" filter="url(#seatShadow)"/>`;
                svg += `<rect x="${colX}" y="${rowY}" width="${colWidth-1}" height="${rowHeight-1}" rx="1.5" fill="url(#seatGrad)"/>`;
            }
        }

        svg += '</svg>';
        return svg;
    },

    // Helper to generate seat patterns for SVG previews
    _generateSeatPattern(x, y, width, height, seatWidth, seatHeight, opacity, fillColor = 'white') {
        let pattern = '';
        const cols = Math.floor(width / (seatWidth + 1));
        const rows = Math.floor(height / (seatHeight + 1));

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const sx = x + c * (seatWidth + 1);
                const sy = y + r * (seatHeight + 1);
                pattern += `<circle cx="${sx + seatWidth/2}" cy="${sy + seatHeight/2}" r="${seatWidth/2.5}" fill="${fillColor}" opacity="${opacity}"/>`;
            }
        }

        return pattern;
    }
};
