// TicketMada Profile Menu Component
// Gender-based avatar + dropdown menu for logged-in users

window.ProfileMenu = {
    // Malagasy name gender detection
    maleNames: ['rakoto','rabe','solo','andry','jean','faly','hery','nirina','toky','ando','tojo','lanto','mahery','hasina','rado','tsiry','mamy','zo','aina','ny','ndriana','haja','lova','tiana','faniry','rajo','miandry','sitraka','jaojoby','dama','erick'],
    femaleNames: ['marie','nina','sandra','fara','miora','voahirana','lalaina','tahina','noro','soa','bako','lala','vola','nantenaina','haingo','mbolatiana','koloina','rindra','harena','sarobidy','diary','kanto','ravaka','mirana','anjara','noeline'],

    detectGender(name) {
        if (!name) return 'neutral';
        const first = name.toLowerCase().split(' ')[0].trim();
        if (this.femaleNames.some(n => first.includes(n))) return 'female';
        if (this.maleNames.some(n => first.includes(n))) return 'male';
        // Common international hints
        if (first.endsWith('a') || first.endsWith('ine') || first.endsWith('elle') || first.endsWith('ette')) return 'female';
        return 'male';
    },

    getAvatarSVG(name, gender) {
        const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
        const colors = {
            male: { bg: '#4A90FF', hair: '#2C1810', skin: '#D4A574', shirt: '#1a1a1a' },
            female: { bg: '#FF6B9D', hair: '#1a1a1a', skin: '#D4A574', shirt: '#FF6B4A' },
            neutral: { bg: '#00D9A5', hair: '#4A3728', skin: '#D4A574', shirt: '#666' }
        };
        const c = colors[gender] || colors.neutral;

        return `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
            <rect width="60" height="60" rx="30" fill="${c.bg}"/>
            <circle cx="30" cy="22" r="11" fill="${c.skin}"/>
            ${gender === 'female'
                ? `<path d="M19 18 C19 10, 41 10, 41 18 L41 22 C41 22, 38 16, 30 16 C22 16, 19 22, 19 22 Z" fill="${c.hair}"/>
                   <path d="M17 20 C17 20, 18 26, 19 22" fill="${c.hair}" stroke="${c.hair}" stroke-width="2"/>
                   <path d="M43 20 C43 20, 42 26, 41 22" fill="${c.hair}" stroke="${c.hair}" stroke-width="2"/>`
                : `<path d="M20 20 C20 12, 40 12, 40 20 L40 18 C40 18, 38 14, 30 14 C22 14, 20 18, 20 18 Z" fill="${c.hair}"/>`
            }
            <circle cx="26" cy="21" r="1.2" fill="#1a1a1a"/>
            <circle cx="34" cy="21" r="1.2" fill="#1a1a1a"/>
            <path d="M27 26 Q30 29, 33 26" fill="none" stroke="#1a1a1a" stroke-width="0.8" stroke-linecap="round"/>
            <path d="M15 60 L15 45 C15 37, 22 33, 30 33 C38 33, 45 37, 45 45 L45 60 Z" fill="${c.shirt}"/>
            <text x="30" y="48" text-anchor="middle" fill="white" font-size="8" font-family="Syne, sans-serif" font-weight="700">${initials}</text>
        </svg>`;
    },

    injectStyles() {
        if (document.getElementById('profile-menu-styles')) return;
        const style = document.createElement('style');
        style.id = 'profile-menu-styles';
        style.textContent = `
            .profile-wrapper { position: relative; }
            .profile-avatar-btn { width: 44px; height: 44px; border-radius: 50%; border: 3px solid var(--border-dark); cursor: pointer; overflow: hidden; padding: 0; background: none; box-shadow: 3px 3px 0 var(--border-dark); transition: transform 0.15s, box-shadow 0.15s; }
            .profile-avatar-btn:hover { transform: translate(-2px, -2px); box-shadow: 5px 5px 0 var(--border-dark); }
            .profile-avatar-btn:active { transform: translate(1px, 1px); box-shadow: 2px 2px 0 var(--border-dark); }
            .profile-avatar-btn svg { width: 100%; height: 100%; display: block; }
            .profile-dropdown { position: absolute; top: calc(100% + 10px); right: 0; width: 260px; background: white; border: 3px solid var(--border-dark); box-shadow: 6px 6px 0 var(--border-dark); z-index: 2001; opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.2s ease; }
            .profile-dropdown.open { opacity: 1; visibility: visible; transform: translateY(0); }
            .profile-dropdown-header { padding: 20px; border-bottom: 2px solid var(--border-dark); display: flex; align-items: center; gap: 14px; }
            .profile-dropdown-avatar { width: 44px; height: 44px; border-radius: 50%; overflow: hidden; border: 2px solid var(--border-dark); flex-shrink: 0; }
            .profile-dropdown-avatar svg { width: 100%; height: 100%; }
            .profile-dropdown-info { flex: 1; min-width: 0; }
            .profile-dropdown-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.95rem; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .profile-dropdown-email { font-size: 0.75rem; color: var(--text-light); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .profile-dropdown-role { display: inline-block; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 3px; margin-top: 4px; }
            .profile-dropdown-role.superadmin, .profile-dropdown-role.admin { background: #FF6B4A; color: white; }
            .profile-dropdown-role.organizer { background: #4A90FF; color: white; }
            .profile-dropdown-role.buyer { background: #00D9A5; color: white; }
            .profile-dropdown-items { padding: 8px 0; }
            .profile-dropdown-item { display: flex; align-items: center; gap: 12px; padding: 12px 20px; cursor: pointer; transition: background 0.12s; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: var(--text-dark); text-decoration: none; border: none; background: none; width: 100%; text-align: left; }
            .profile-dropdown-item:hover { background: #FFF5F2; }
            .profile-dropdown-item .v-icon { opacity: 0.6; }
            .profile-dropdown-divider { height: 2px; background: #f0f0f0; margin: 4px 0; }
            .profile-dropdown-item.logout { color: #e74c3c; }
            .profile-dropdown-item.logout:hover { background: #fef2f2; }
        `;
        document.head.appendChild(style);
    }
};
