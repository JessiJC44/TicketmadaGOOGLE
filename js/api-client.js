// TicketMada API Client
class TicketMadaAPI {
    constructor() {
        this.baseURL = (window.API_CONFIG && window.API_CONFIG.baseURL) || '/api';
        this.token = localStorage.getItem('ticketmada-token') || null;
        this.user = JSON.parse(localStorage.getItem('ticketmada-user') || 'null');
    }

    async request(method, endpoint, data = null) {
        const url = `${this.baseURL}${endpoint}`;
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const json = await response.json();

            if (response.status === 401) {
                this.clearAuth();
                return { error: 'Non authentifié', status: 401 };
            }

            if (!response.ok) {
                return { error: json.error || 'Erreur serveur', status: response.status };
            }

            return json;
        } catch (err) {
            console.error('API Error:', err);
            return { error: 'Erreur réseau', status: 0 };
        }
    }

    get(endpoint) { return this.request('GET', endpoint); }
    post(endpoint, data) { return this.request('POST', endpoint, data); }
    put(endpoint, data) { return this.request('PUT', endpoint, data); }
    delete(endpoint) { return this.request('DELETE', endpoint); }

    // Auth methods
    async register(name, email, password, role = 'buyer') {
        const result = await this.post('/auth/register', { name, email, password, role });
        if (result.token) this.setAuth(result.token, result.user);
        return result;
    }

    async login(email, password) {
        const result = await this.post('/auth/login', { email, password });
        if (result.token) this.setAuth(result.token, result.user);
        return result;
    }

    async oauthLogin(provider, name, email) {
        const result = await this.post('/auth/oauth', { provider, name, email });
        if (result.token) this.setAuth(result.token, result.user);
        return result;
    }

    async getMe() {
        return await this.get('/auth/me');
    }

    async logout() {
        await this.post('/auth/logout');
        this.clearAuth();
    }

    setAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('ticketmada-token', token);
        localStorage.setItem('ticketmada-user', JSON.stringify(user));
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('ticketmada-token');
        localStorage.removeItem('ticketmada-user');
    }

    isLoggedIn() {
        return !!this.token;
    }

    getUser() {
        return this.user;
    }

    getUserRole() {
        return this.user ? this.user.role : null;
    }
}

// Global instance
window.api = new TicketMadaAPI();
