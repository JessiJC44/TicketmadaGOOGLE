#!/bin/bash
# ============================================================
# TMscanner — Lanceur complet (Backend + Flutter Web PWA)
# ============================================================
# Usage: bash START-TMSCANNER.sh
#
# Ce script:
#  1. Lance le backend Node.js (port 8000)
#  2. Lance Flutter Web (accessible sur le réseau local)
#  3. Affiche les URLs pour Mac et iPhone
# ============================================================

set -e
cd "$(dirname "$0")"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}🎫 TMscanner — TicketMada QR Scanner${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
echo -e "${CYAN}📡 IP locale détectée: ${BOLD}${LOCAL_IP}${NC}"
echo ""

# Check if backend dependencies need rebuild
if [ ! -d "node_modules/better-sqlite3/build" ] || ! node -e "require('better-sqlite3')" 2>/dev/null; then
    echo -e "${YELLOW}⚙️  Recompilation de better-sqlite3...${NC}"
    npm rebuild better-sqlite3
    echo -e "${GREEN}✅ better-sqlite3 recompilé${NC}"
    echo ""
fi

# Kill any existing processes on our ports
lsof -ti:8000 2>/dev/null | xargs kill -9 2>/dev/null || true

# Start backend
echo -e "${YELLOW}🚀 Démarrage du backend API (port 8000)...${NC}"
node backend/server-node.js &
BACKEND_PID=$!
sleep 2

# Check if backend started
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Backend API démarré (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}❌ Erreur: Le backend n'a pas démarré${NC}"
    echo -e "   Essayez: ${BOLD}npm rebuild better-sqlite3${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🚀 Démarrage de TMscanner Flutter Web...${NC}"
echo -e "   (Accessible sur le réseau local pour iPhone)"
echo ""

# Set Brave as Chrome executable if available
if [ -f "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" ]; then
    export CHROME_EXECUTABLE="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
fi

# Start Flutter web on 0.0.0.0 for LAN access
cd tmscanner

echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BOLD}📱 INSTALLER SUR iPHONE:${NC}"
echo -e "   1. Ouvrir Safari sur iPhone"
echo -e "   2. Aller à l'URL Flutter affichée ci-dessous"
echo -e "      (remplacer localhost par ${BOLD}${LOCAL_IP}${NC})"
echo -e "   3. Taper le bouton ${BOLD}Partager ⬆️${NC}"
echo -e "   4. Choisir ${BOLD}\"Sur l'écran d'accueil\"${NC}"
echo -e "   5. TMscanner apparaît comme une app !"
echo ""
echo -e "${BOLD}🔑 IDENTIFIANTS:${NC}"
echo -e "   URL Serveur: ${CYAN}http://${LOCAL_IP}:8000/api${NC}"
echo -e "   Email:       ${CYAN}superadmin@ticketmada.mg${NC}"
echo -e "   Mot de passe:${CYAN} password123${NC}"
echo ""
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run Flutter with web-hostname 0.0.0.0 for LAN access
flutter run -d chrome --web-hostname 0.0.0.0 --web-port 5050

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null
echo -e "\n${GREEN}👋 TMscanner arrêté.${NC}"
