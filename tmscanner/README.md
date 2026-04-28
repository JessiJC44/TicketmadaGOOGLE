# 🎫 TMscanner — TicketMada QR Access Control

Application mobile Flutter (iOS + Android) pour le contrôle d'accès par scan de QR codes lors des événements TicketMada.

## Stack technique

| Technologie | Rôle |
|-------------|------|
| **Flutter** | Framework mobile cross-platform |
| **Dart** | Langage de programmation |
| **Node.js** | Backend API REST (existant) |
| **Electron** | App desktop TicketMada |
| **Laravel/PHP** | Backend production (futur) |
| **MySQL** | Base de données production |

## Fonctionnalités

- 📷 **Scan QR** — Caméra temps réel avec détection instantanée
- ✅ **3 états de résultat** — Valide (vert), Déjà scanné (orange), Invalide (rouge)
- 📊 **Stats live** — Billets vendus, arrivés, en attente, taux, rejetés
- 📜 **Historique** — Liste complète des scans avec filtres
- 📱 **Gestion appareils** — Nom, IP, OS, compteur scans
- 🔇 **Mode hors ligne** — Cache local des scans
- 🔔 **Feedback haptique** — Vibration + son selon le résultat
- 🔐 **Auth sécurisée** — Bearer token, connexion API

## Installation

### Prérequis
- Flutter SDK >= 3.2.0
- Dart SDK >= 3.2.0
- Android Studio ou Xcode
- Backend TicketMada en cours d'exécution

### Setup

```bash
cd tmscanner

# Installer les dépendances
flutter pub get

# Lancer sur simulateur/appareil
flutter run

# Build Android APK
flutter build apk --release

# Build iOS
flutter build ios --release
```

### Configuration serveur

Par défaut, l'app se connecte à `http://localhost:8000/api`.
Modifier l'URL dans l'écran de connexion ou dans `lib/config/api_config.dart`.

## Architecture

```
lib/
├── main.dart                  # Entry point + GoRouter
├── config/
│   ├── theme.dart             # Design system TicketMada
│   └── api_config.dart        # URLs + constantes
├── models/
│   ├── scan_result.dart       # Résultat scan (3 états)
│   ├── event.dart             # Événement
│   └── ticket.dart            # Billet
├── services/
│   ├── api_service.dart       # HTTP client (Dio)
│   ├── storage_service.dart   # Cache local
│   └── haptic_service.dart    # Son + vibration
├── screens/
│   ├── splash_screen.dart     # Logo animé
│   ├── login_screen.dart      # Connexion + sélection événement
│   ├── scanner_screen.dart    # Caméra QR (écran principal)
│   ├── history_screen.dart    # Historique scans
│   ├── stats_screen.dart      # Statistiques live
│   └── settings_screen.dart   # Paramètres + déconnexion
└── widgets/
    ├── scan_result_card.dart  # Carte résultat (vert/orange/rouge)
    └── stat_card.dart         # Carte statistique
```

## API Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/auth/login` | POST | Connexion (email + password) |
| `/api/auth/me` | GET | Vérifier session |
| `/api/events` | GET | Liste des événements |
| `/api/tickets/:id/scan` | PUT | Scanner un billet |
| `/api/tickets/stats` | GET | Statistiques |

## Résultats de scan

| État | Couleur | Vibration | Son |
|------|---------|-----------|-----|
| ✅ Valide | Vert (#E8F5E9) | Courte | Beep |
| ⚠️ Déjà scanné | Orange (#FFF3E0) | Double | Alert |
| ❌ Invalide | Rouge (#FFEBEE) | Longue | Error |

## Design

L'app utilise le design system **néo-brutal** de TicketMada :
- **Coral** (#FF6B4A) — Couleur primaire
- **Mint** (#00D9A5) — Succès
- **Jaune** (#FECA57) — Avertissement
- **Rouge** (#E74C3C) — Erreur
- **Crème** (#FAF7F2) — Fond
- **Polices** : Syne (titres) + DM Sans (corps)
- **Bordures épaisses** + ombres dures (4px offset)

## Licence

© 2026 TicketMada — Plateforme de billetterie événementielle de Madagascar
