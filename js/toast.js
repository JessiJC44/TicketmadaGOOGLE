// js/toast.js — TicketMada Toast Notification System
window.Toast = {
    _container: null,

    _getContainer() {
        if (!this._container) {
            this._container = document.createElement('div');
            this._container.className = 'toast-container';
            this._container.setAttribute('aria-live', 'polite');
            this._container.setAttribute('role', 'status');
            document.body.appendChild(this._container);
        }
        return this._container;
    },

    show(type, message, duration = 4000) {
        const container = this._getContainer();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
            <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toast-out 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(msg, dur) { this.show('success', msg, dur); },
    error(msg, dur) { this.show('error', msg, dur || 6000); },
    warning(msg, dur) { this.show('warning', msg, dur); },
    info(msg, dur) { this.show('info', msg, dur); }
};
