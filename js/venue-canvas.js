/**
 * VenueCanvas - Interactive venue seat selection engine
 * Renders SVG-based blocks with individual clickable seats
 * Inspired by open-source canvas seat libraries
 * Built for TicketMada - No external dependencies required
 */
class VenueCanvas {
    constructor(containerId, config = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error('Container not found: ' + containerId);
        
        this.config = {
            seatRadius: config.seatRadius || 10,
            seatGap: config.seatGap || 6,
            blockGap: config.blockGap || 40,
            colors: {
                available: '#e8e8e8',
                selected: '#00D9A5',
                sold: '#ccc',
                hover: '#FECA57',
                ...config.colors
            },
            style: {
                bg: config.bg || '#FAF7F2',
                border: '#1a1a1a',
                font: "'Syne', sans-serif"
            },
            maxSelect: config.maxSelect || 10,
            onSelect: config.onSelect || null,
            onDeselect: config.onDeselect || null,
            onChange: config.onChange || null,
            lang: config.lang || 'fr'
        };

        this.blocks = [];
        this.selectedSeats = [];
        this.hoveredSeat = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.tooltip = null;
        this.focusedBlock = null;

        this._initSVG();
        this._initEvents();
    }

    _initSVG() {
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.style.background = this.config.style.bg;
        this.container.style.border = '3px solid ' + this.config.style.border;
        this.container.style.cursor = 'grab';
        this.container.style.userSelect = 'none';
        this.container.style.touchAction = 'none';

        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.style.display = 'block';
        this.container.appendChild(this.svg);

        // Main group for pan/zoom transforms
        this.mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.svg.appendChild(this.mainGroup);

        // Tooltip element
        this.tooltipEl = document.createElement('div');
        this.tooltipEl.className = 'vc-tooltip';
        this.tooltipEl.style.cssText = 'position:absolute;display:none;background:#1a1a1a;color:#fff;padding:8px 14px;font-size:0.8rem;font-family:"DM Sans",sans-serif;border:2px solid #1a1a1a;box-shadow:4px 4px 0 rgba(0,0,0,0.2);pointer-events:none;z-index:10;white-space:nowrap;';
        this.container.appendChild(this.tooltipEl);
    }

    _initEvents() {
        // Mouse wheel zoom
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.container.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(0.3, Math.min(5, this.zoom * delta));
            
            // Zoom toward cursor
            this.panX = mx - (mx - this.panX) * (newZoom / this.zoom);
            this.panY = my - (my - this.panY) * (newZoom / this.zoom);
            this.zoom = newZoom;
            this._updateTransform();
        }, { passive: false });

        // Pan with mouse drag
        this.container.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'circle' || e.target.tagName === 'rect') return;
            this.isDragging = true;
            this.dragStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
            this.container.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.panX = e.clientX - this.dragStart.x;
            this.panY = e.clientY - this.dragStart.y;
            this._updateTransform();
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.container.style.cursor = 'grab';
        });

        // Touch events for mobile
        let lastTouchDist = 0;
        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.dragStart = { x: e.touches[0].clientX - this.panX, y: e.touches[0].clientY - this.panY };
            } else if (e.touches.length === 2) {
                lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            }
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && this.isDragging) {
                this.panX = e.touches[0].clientX - this.dragStart.x;
                this.panY = e.touches[0].clientY - this.dragStart.y;
                this._updateTransform();
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const scale = dist / lastTouchDist;
                this.zoom = Math.max(0.3, Math.min(5, this.zoom * scale));
                lastTouchDist = dist;
                this._updateTransform();
            }
        }, { passive: false });

        this.container.addEventListener('touchend', () => { this.isDragging = false; });
    }

    _updateTransform() {
        this.mainGroup.setAttribute('transform', `translate(${this.panX},${this.panY}) scale(${this.zoom})`);
    }

    /**
     * Load venue data: array of blocks, each with seats
     * Block: { id, title, color, seats: [{ id, row, col, x, y, price, salable, status }] }
     */
    loadData(blocks) {
        this.blocks = blocks;
        this.selectedSeats = [];
        this._render();
        this.fitToView();
    }

    /**
     * Generate a venue layout from zone config
     * zones: [{ id, name, color, price, rows, seatsPerRow, available, capacity }]
     */
    generateFromZones(zones, venueType = 'concert') {
        const blocks = [];
        let currentY = 80; // Start below stage

        // Stage element
        this._stageY = 0;
        this._stageW = 0;

        zones.forEach((zone, idx) => {
            const rows = zone.rows || Math.ceil(zone.capacity / (zone.seatsPerRow || 20));
            const cols = zone.seatsPerRow || Math.min(Math.ceil(zone.capacity / rows), 30);
            const totalSeats = zone.capacity || rows * cols;
            const soldCount = totalSeats - (zone.available || totalSeats);
            const gap = this.config.seatRadius * 2 + this.config.seatGap;
            
            const seats = [];
            let seatIdx = 0;
            const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

            for (let r = 0; r < rows && seatIdx < totalSeats; r++) {
                for (let c = 0; c < cols && seatIdx < totalSeats; c++) {
                    const isSold = seatIdx < soldCount;
                    seats.push({
                        id: `${zone.id}-${r}-${c}`,
                        row: rowLabels[r % 26],
                        col: c + 1,
                        x: c * gap,
                        y: r * gap,
                        price: zone.price,
                        salable: !isSold,
                        status: isSold ? 'sold' : 'available',
                        zoneName: zone.name
                    });
                    seatIdx++;
                }
            }

            const blockWidth = cols * gap;
            if (blockWidth > this._stageW) this._stageW = blockWidth;

            blocks.push({
                id: zone.id,
                title: zone.name,
                color: zone.color,
                price: zone.price,
                seats: seats,
                offsetX: 0,
                offsetY: currentY,
                rows: rows,
                cols: cols,
                available: zone.available || totalSeats - soldCount
            });

            currentY += (rows * gap) + this.config.blockGap;
        });

        // Center blocks horizontally
        const maxW = Math.max(...blocks.map(b => b.cols * (this.config.seatRadius * 2 + this.config.seatGap)));
        blocks.forEach(b => {
            const bw = b.cols * (this.config.seatRadius * 2 + this.config.seatGap);
            b.offsetX = (maxW - bw) / 2;
        });

        this.loadData(blocks);
    }

    _render() {
        this.mainGroup.innerHTML = '';
        const R = this.config.seatRadius;
        const gap = R * 2 + this.config.seatGap;

        // Draw stage
        const stageW = this._stageW || 400;
        const stageG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        const stageRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        stageRect.setAttribute('x', -20);
        stageRect.setAttribute('y', 0);
        stageRect.setAttribute('width', stageW + 40);
        stageRect.setAttribute('height', 45);
        stageRect.setAttribute('rx', 8);
        stageRect.setAttribute('fill', '#1a1a1a');
        stageG.appendChild(stageRect);

        const stageText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        stageText.setAttribute('x', stageW / 2);
        stageText.setAttribute('y', 28);
        stageText.setAttribute('text-anchor', 'middle');
        stageText.setAttribute('fill', '#fff');
        stageText.setAttribute('font-family', this.config.style.font);
        stageText.setAttribute('font-weight', '800');
        stageText.setAttribute('font-size', '16');
        stageText.setAttribute('letter-spacing', '4');
        stageText.textContent = 'STAGE';
        stageG.appendChild(stageText);
        this.mainGroup.appendChild(stageG);

        // Draw blocks
        this.blocks.forEach(block => {
            const blockG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            blockG.setAttribute('transform', `translate(${block.offsetX}, ${block.offsetY})`);
            blockG.setAttribute('data-block', block.id);

            // Block title
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            title.setAttribute('x', -5);
            title.setAttribute('y', -8);
            title.setAttribute('fill', block.color);
            title.setAttribute('font-family', this.config.style.font);
            title.setAttribute('font-weight', '700');
            title.setAttribute('font-size', '13');
            const priceStr = block.price ? ` — ${block.price.toLocaleString()} Ar` : '';
            const availStr = block.available !== undefined ? ` (${block.available} ${this.config.lang === 'fr' ? 'dispo' : 'avail'})` : '';
            title.textContent = block.title + priceStr + availStr;
            blockG.appendChild(title);

            // Draw seats
            block.seats.forEach(seat => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', seat.x + R);
                circle.setAttribute('cy', seat.y + R);
                circle.setAttribute('r', R);
                circle.setAttribute('data-seat', seat.id);
                circle.setAttribute('data-block', block.id);
                circle.style.transition = 'fill 0.15s, r 0.15s, stroke-width 0.15s';
                circle.style.cursor = seat.salable ? 'pointer' : 'default';
                
                this._setSeatColor(circle, seat);

                if (seat.salable) {
                    circle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this._toggleSeat(seat, circle, block);
                    });

                    circle.addEventListener('mouseenter', (e) => {
                        if (seat.status !== 'selected') {
                            circle.setAttribute('fill', this.config.colors.hover);
                            circle.setAttribute('r', R + 2);
                        }
                        this._showTooltip(e, seat, block);
                    });

                    circle.addEventListener('mouseleave', () => {
                        if (seat.status !== 'selected') {
                            this._setSeatColor(circle, seat);
                            circle.setAttribute('r', R);
                        }
                        this._hideTooltip();
                    });
                }

                blockG.appendChild(circle);
            });

            // Row labels
            const rowsSeen = new Set();
            block.seats.forEach(seat => {
                if (!rowsSeen.has(seat.row)) {
                    rowsSeen.add(seat.row);
                    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    label.setAttribute('x', -18);
                    label.setAttribute('y', seat.y + R + 4);
                    label.setAttribute('fill', '#999');
                    label.setAttribute('font-size', '10');
                    label.setAttribute('font-family', "'DM Sans', sans-serif");
                    label.setAttribute('text-anchor', 'middle');
                    label.textContent = seat.row;
                    blockG.appendChild(label);
                }
            });

            this.mainGroup.appendChild(blockG);
        });
    }

    _setSeatColor(circle, seat) {
        if (seat.status === 'selected') {
            circle.setAttribute('fill', this.config.colors.selected);
            circle.setAttribute('stroke', '#1a1a1a');
            circle.setAttribute('stroke-width', '2');
        } else if (seat.status === 'sold' || !seat.salable) {
            circle.setAttribute('fill', this.config.colors.sold);
            circle.setAttribute('stroke', 'none');
            circle.setAttribute('stroke-width', '0');
            circle.style.opacity = '0.4';
        } else {
            const block = this.blocks.find(b => b.seats.includes(seat));
            circle.setAttribute('fill', block ? block.color : this.config.colors.available);
            circle.setAttribute('stroke', '#1a1a1a');
            circle.setAttribute('stroke-width', '1');
            circle.style.opacity = '1';
        }
    }

    _toggleSeat(seat, circle, block) {
        if (seat.status === 'selected') {
            // Deselect
            seat.status = 'available';
            this.selectedSeats = this.selectedSeats.filter(s => s.id !== seat.id);
            this._setSeatColor(circle, seat);
            circle.setAttribute('r', this.config.seatRadius);
            if (this.config.onDeselect) this.config.onDeselect(seat, block);
        } else if (this.selectedSeats.length < this.config.maxSelect) {
            // Select
            seat.status = 'selected';
            this.selectedSeats.push({ ...seat, blockTitle: block.title, blockColor: block.color });
            this._setSeatColor(circle, seat);
            circle.setAttribute('r', this.config.seatRadius + 2);
            if (this.config.onSelect) this.config.onSelect(seat, block);
        }
        if (this.config.onChange) this.config.onChange(this.selectedSeats);
    }

    _showTooltip(e, seat, block) {
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const status = seat.status === 'sold' ? (this.config.lang === 'fr' ? 'Vendu' : 'Sold') :
                       seat.status === 'selected' ? (this.config.lang === 'fr' ? 'Sélectionné' : 'Selected') :
                       (this.config.lang === 'fr' ? 'Disponible' : 'Available');
        
        this.tooltipEl.innerHTML = `<strong>${block.title}</strong><br>` +
            `${this.config.lang === 'fr' ? 'Rang' : 'Row'} ${seat.row}, ${this.config.lang === 'fr' ? 'Place' : 'Seat'} ${seat.col}<br>` +
            `<span style="color:${seat.status === 'sold' ? '#e74c3c' : '#00D9A5'}">${status}</span>` +
            (seat.price ? `<br><strong>${seat.price.toLocaleString()} Ar</strong>` : '');
        
        this.tooltipEl.style.display = 'block';
        this.tooltipEl.style.left = (x + 15) + 'px';
        this.tooltipEl.style.top = (y - 10) + 'px';
    }

    _hideTooltip() {
        this.tooltipEl.style.display = 'none';
    }

    fitToView() {
        if (!this.blocks.length) return;
        const containerW = this.container.clientWidth || 600;
        const containerH = this.container.clientHeight || 500;
        const gap = this.config.seatRadius * 2 + this.config.seatGap;

        // Calculate bounds
        let minX = Infinity, minY = 0, maxX = 0, maxY = 0;
        this.blocks.forEach(b => {
            b.seats.forEach(s => {
                const sx = s.x + b.offsetX;
                const sy = s.y + b.offsetY;
                if (sx < minX) minX = sx;
                if (sx + gap > maxX) maxX = sx + gap;
                if (sy + gap > maxY) maxY = sy + gap;
            });
        });

        const contentW = maxX - minX + 60;
        const contentH = maxY + 40;
        this.zoom = Math.min(containerW / contentW, containerH / contentH) * 0.85;
        this.panX = (containerW - contentW * this.zoom) / 2 - minX * this.zoom;
        this.panY = (containerH - contentH * this.zoom) / 2 + 10;
        this._updateTransform();
    }

    zoomToBlock(blockId) {
        const block = this.blocks.find(b => b.id === blockId);
        if (!block) return;
        
        const containerW = this.container.clientWidth;
        const containerH = this.container.clientHeight;
        const gap = this.config.seatRadius * 2 + this.config.seatGap;
        const bw = block.cols * gap;
        const bh = block.rows * gap;

        this.zoom = Math.min(containerW / (bw + 80), containerH / (bh + 80)) * 0.8;
        this.panX = (containerW / 2) - (block.offsetX + bw / 2) * this.zoom;
        this.panY = (containerH / 2) - (block.offsetY + bh / 2) * this.zoom;
        this.focusedBlock = blockId;
        this._updateTransform();
    }

    zoomIn() { this.zoom = Math.min(5, this.zoom * 1.3); this._updateTransform(); }
    zoomOut() { this.zoom = Math.max(0.3, this.zoom * 0.7); this._updateTransform(); }
    resetView() { this.focusedBlock = null; this.fitToView(); }

    getSelectedSeats() { return [...this.selectedSeats]; }
    
    clearSelection() {
        this.selectedSeats.forEach(s => {
            const origSeat = this._findSeat(s.id);
            if (origSeat) {
                origSeat.status = 'available';
                const circle = this.mainGroup.querySelector(`[data-seat="${s.id}"]`);
                if (circle) {
                    this._setSeatColor(circle, origSeat);
                    circle.setAttribute('r', this.config.seatRadius);
                }
            }
        });
        this.selectedSeats = [];
        if (this.config.onChange) this.config.onChange([]);
    }

    _findSeat(seatId) {
        for (const block of this.blocks) {
            const seat = block.seats.find(s => s.id === seatId);
            if (seat) return seat;
        }
        return null;
    }

    destroy() {
        this.container.innerHTML = '';
    }
}

// Export for browser
window.VenueCanvas = VenueCanvas;
