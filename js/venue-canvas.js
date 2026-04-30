/**
 * VenueCanvas - High-performance interactive venue seat selection engine
 * Inspired by open-source seat selection libraries
 * Built for TicketMada - No external dependencies (Seatmap mentioned nowhere)
 */
class VenueCanvas {
    constructor(containerId, config = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error('Container not found: ' + containerId);

        this.config = {
            seatRadius: config.seatRadius || 8,
            seatGap: config.seatGap || 4,
            blockGap: config.blockGap || 40,
            colors: {
                available: '#e8e8e8',
                selected: '#FF6B4A',
                sold: '#cccccc',
                hover: '#FECA57',
                ...config.colors
            },
            maxSelect: config.maxSelect || 10,
            lang: config.lang || 'fr',
            onChange: config.onChange || null,
        };

        this.blocks = [];
        this.selectedSeats = [];
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        this._initLayout();
        this._initEvents();
    }

    _initLayout() {
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.style.cursor = 'grab';
        this.container.style.userSelect = 'none';
        this.container.style.background = '#fcfaf7';

        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.style.display = 'block';
        this.container.appendChild(this.svg);

        // Transformation group
        this.viewport = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.svg.appendChild(this.viewport);

        // Tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'vc-tooltip';
        this.tooltip.style.cssText = 'position:absolute;display:none;background:#1a1a1a;color:#fff;padding:8px 12px;font-size:0.75rem;font-family:sans-serif;font-weight:600;border:2px solid #101010;box-shadow:4px 4px 0 rgba(0,0,0,0.2);pointer-events:none;z-index:9999;';
        this.container.appendChild(this.tooltip);
    }

    _initEvents() {
        let isDragging = false;
        let startX, startY;

        this.container.addEventListener('mousedown', (e) => {
            if (e.target.closest('circle')) return;
            isDragging = true;
            this.container.style.cursor = 'grabbing';
            startX = e.clientX - this.panX;
            startY = e.clientY - this.panY;
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.panX = e.clientX - startX;
                this.panY = e.clientY - startY;
                this._updateTransform();
            }
            if (this.tooltip.style.display === 'block') {
                this._moveTooltip(e);
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            this.container.style.cursor = 'grab';
        });

        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.container.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            const nextZoom = Math.max(0.1, Math.min(10, this.zoom * factor));

            this.panX = mx - (mx - this.panX) * (nextZoom / this.zoom);
            this.panY = my - (my - this.panY) * (nextZoom / this.zoom);
            this.zoom = nextZoom;
            this._updateTransform();
        }, { passive: false });

        // Touch support
        let lastDist = 0;
        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                startX = e.touches[0].clientX - this.panX;
                startY = e.touches[0].clientY - this.panY;
            } else if (e.touches.length === 2) {
                lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            }
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isDragging) {
                this.panX = e.touches[0].clientX - startX;
                this.panY = e.touches[0].clientY - startY;
                this._updateTransform();
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const scale = dist / lastDist;
                this.zoom = Math.max(0.1, Math.min(10, this.zoom * scale));
                lastDist = dist;
                this._updateTransform();
            }
        }, { passive: false });

        this.container.addEventListener('touchend', () => { isDragging = false; });
    }

    _updateTransform() {
        this.viewport.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
    }

    /**
     * Load seat data directly from an object (compatible with seatmap-canvas structure)
     */
    loadData(data) {
        if (!data || !data.blocks) return;
        this.blocks = data.blocks.map(block => ({
            id: block.id,
            title: block.title,
            color: block.color,
            x: block.x || 0,
            y: block.y || 0,
            width: block.width || 200,
            height: block.height || 200,
            seats: block.seats.map(seat => ({
                id: seat.id,
                name: seat.name || seat.id,
                x: seat.x,
                y: seat.y,
                price: seat.price || 0,
                status: seat.status || 'available'
            }))
        }));
        this._render();
        this.fitToView();
    }

    /**
     * zones: [{ id, name, color, price, rows, seatsPerRow, available, capacity }]
     */
    generateFromZones(zones, type = 'arena') {
        this.blocks = [];
        let currentY = 100;
        const R = this.config.seatRadius;
        const gap = R * 2 + this.config.seatGap;

        // Determine max width for centering
        let maxWidth = 0;
        zones.forEach(z => {
            const w = (z.seatsPerRow || 20) * gap;
            if (w > maxWidth) maxWidth = w;
        });

        zones.forEach((zone) => {
            const rows = zone.rows || 5;
            const cols = zone.seatsPerRow || 20;
            const seats = [];
            const blockWidth = cols * gap;

            const totalInZone = rows * cols;
            const soldCount = totalInZone - (zone.available || Math.floor(totalInZone * 0.8));

            for (let r = 0; r < rows; r++) {
                const rowLabel = String.fromCharCode(65 + r);
                for (let c = 0; c < cols; c++) {
                    const idx = r * cols + c;
                    const isSold = idx < soldCount;
                    
                    seats.push({
                        id: `${zone.id}-${rowLabel}-${c+1}`,
                        name: `${zone.name} - ${rowLabel}${c+1}`,
                        x: c * gap,
                        y: r * gap,
                        price: zone.price,
                        status: isSold ? 'sold' : 'available'
                    });
                }
            }

            this.blocks.push({
                id: zone.id,
                title: zone.name,
                color: zone.color,
                x: (maxWidth - blockWidth) / 2,
                y: currentY,
                seats: seats,
                width: blockWidth,
                height: rows * gap
            });

            currentY += (rows * gap) + this.config.blockGap;
        });

        this._render();
        this.fitToView();
    }

    _render() {
        this.viewport.innerHTML = '';
        const R = this.config.seatRadius;

        // Stage element
        const maxW = Math.max(...this.blocks.map(b => b.width), 300);
        const stageGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        const stageRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        stageRect.setAttribute('x', -30);
        stageRect.setAttribute('y', 0);
        stageRect.setAttribute('width', maxW + 60);
        stageRect.setAttribute('height', 60);
        stageRect.setAttribute('fill', '#1a1a1a');
        stageRect.setAttribute('rx', '8');
        stageGroup.appendChild(stageRect);

        const stageText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        stageText.setAttribute('x', maxW / 2);
        stageText.setAttribute('y', 38);
        stageText.setAttribute('text-anchor', 'middle');
        stageText.setAttribute('fill', '#fff');
        stageText.setAttribute('font-weight', 'bold');
        stageText.setAttribute('font-family', 'Syne, sans-serif');
        stageText.setAttribute('font-size', '16');
        stageText.setAttribute('letter-spacing', '5');
        stageText.textContent = this.config.lang === 'fr' ? 'SCÈNE' : 'STAGE';
        stageGroup.appendChild(stageText);
        
        this.viewport.appendChild(stageGroup);

        this.blocks.forEach(block => {
            const blockGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            blockGroup.setAttribute('transform', `translate(${block.x}, ${block.y})`);

            // Block Label
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', 0);
            label.setAttribute('y', -12);
            label.setAttribute('fill', '#1a1a1a');
            label.setAttribute('font-weight', '700');
            label.setAttribute('font-size', '12');
            label.setAttribute('font-family', 'Syne, sans-serif');
            label.textContent = block.title.toUpperCase();
            blockGroup.appendChild(label);

            // Seats
            block.seats.forEach(seat => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', seat.x + R);
                circle.setAttribute('cy', seat.y + R);
                circle.setAttribute('r', R);
                circle.setAttribute('data-seat', seat.id);
                circle.style.transition = 'all 0.1s ease';
                
                this._styleSeat(circle, seat, block.color);

                if (seat.status !== 'sold') {
                    circle.style.cursor = 'pointer';
                    circle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this._toggleSeat(seat, circle, block);
                    });
                    circle.addEventListener('mouseenter', (e) => {
                        this._onHover(e, seat, circle, block);
                    });
                    circle.addEventListener('mouseleave', () => {
                        this._onLeave(circle, seat, block.color);
                    });
                }

                blockGroup.appendChild(circle);
            });

            this.viewport.appendChild(blockGroup);
        });
    }

    _styleSeat(circle, seat, zoneColor) {
        if (seat.status === 'selected') {
            circle.setAttribute('fill', this.config.colors.selected);
            circle.setAttribute('stroke', '#1a1a1a');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('r', this.config.seatRadius + 1);
        } else if (seat.status === 'sold') {
            circle.setAttribute('fill', this.config.colors.sold);
            circle.setAttribute('stroke', 'none');
            circle.setAttribute('opacity', '0.35');
            circle.setAttribute('r', this.config.seatRadius);
        } else {
            circle.setAttribute('fill', zoneColor || this.config.colors.available);
            circle.setAttribute('stroke', '#1a1a1a');
            circle.setAttribute('stroke-width', '1');
            circle.setAttribute('opacity', '1');
            circle.setAttribute('r', this.config.seatRadius);
        }
    }

    _toggleSeat(seat, circle, block) {
        if (seat.status === 'selected') {
            seat.status = 'available';
            this.selectedSeats = this.selectedSeats.filter(s => s.id !== seat.id);
        } else if (this.selectedSeats.length < this.config.maxSelect) {
            seat.status = 'selected';
            this.selectedSeats.push({ ...seat, zoneId: block.id, zoneName: block.title });
        }
        this._styleSeat(circle, seat, block.color);
        if (this.config.onChange) this.config.onChange(this.selectedSeats);
    }

    _onHover(e, seat, circle, block) {
        circle.setAttribute('stroke-width', '3');
        if (seat.status !== 'selected') {
            circle.setAttribute('fill', this.config.colors.hover);
        }
        
        this.tooltip.style.display = 'block';
        this.tooltip.innerHTML = `<strong>${seat.name}</strong><br>${seat.price.toLocaleString()} Ar`;
        this._moveTooltip(e);
    }

    _moveTooltip(e) {
        const rect = this.container.getBoundingClientRect();
        this.tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
        this.tooltip.style.top = (e.clientY - rect.top - 15) + 'px';
    }

    _onLeave(circle, seat, zoneColor) {
        this._styleSeat(circle, seat, zoneColor);
        this.tooltip.style.display = 'none';
    }

    fitToView() {
        if (!this.blocks.length) return;
        const rect = this.container.getBoundingClientRect();
        const bbox = this.viewport.getBBox();
        const padding = 50;
        
        const zoomX = (rect.width - padding) / bbox.width;
        const zoomY = (rect.height - padding) / bbox.height;
        this.zoom = Math.min(1.5, Math.min(zoomX, zoomY));
        
        this.panX = (rect.width - bbox.width * this.zoom) / 2 - bbox.x * this.zoom;
        this.panY = (rect.height - bbox.height * this.zoom) / 2 - bbox.y * this.zoom;
        
        this._updateTransform();
    }

    zoomToBlock(blockId) {
        const block = this.blocks.find(b => b.id === blockId);
        if (!block) return;
        const rect = this.container.getBoundingClientRect();
        const padding = 60;
        
        this.zoom = Math.min(2.5, Math.min((rect.width - padding) / block.width, (rect.height - padding) / block.height));
        this.panX = (rect.width / 2) - (block.x + block.width / 2) * this.zoom;
        this.panY = (rect.height / 2) - (block.y + block.height / 2) * this.zoom;
        this._updateTransform();
    }

    zoomIn() { this.zoom *= 1.25; this._updateTransform(); }
    zoomOut() { this.zoom /= 1.25; this._updateTransform(); }
    resetView() { this.fitToView(); }
    destroy() { this.container.innerHTML = ''; }
}

window.VenueCanvas = VenueCanvas;
