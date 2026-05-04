# TicketMada SuperAdmin Portal - Intégration Hi.Events & Fonctionnalités Avancées

Ce document détaille les fonctionnalités intégrées au portail SuperAdmin de TicketMada, inspirées de la robustesse de Hi.Events et adaptées au style unique "Brutalist" de la plateforme.

## 1. Dashboard de Performance (Inspiration Hi.Events)
Le dashboard a été enrichi pour offrir une vue d'ensemble critique de la santé de la plateforme :
- **KPIs Dynamiques** : Chiffre d'affaires, Tickets vendus, Commissions collectées (basées sur le taux configurable), et nombre d'organisateurs actifs.
- **Top Performances** : Liste complète des 10 événements les plus rentables avec date, volume de ventes et revenus générés.
- **Graphique de Revenus** : Visualisation des 12 derniers mois de ventes.
- **Répartition par Catégorie** : Analyse des types d'événements les plus populaires.

## 2. Gestion des Licences & Certifications
Un nouveau système de paliers pour les organisateurs a été mis en œuvre :
- **Trois Niveaux de Licence** :
  - **Standard** : Accès de base.
  - **Verified** : Badge de confiance, visibilité accrue, frais réduits envisageables.
  - **Premium** : Support prioritaire, fonctionnalités avancées débloquées.
- **Audit des Licences** : Chaque changement de licence est loggé dans une table d'historique dédié (`license_changes`) pour une traçabilité totale.
- **KYC (Know Your Customer)** : Système backend prêt pour la réception et la vérification des documents (CIN, Passport, NIF, STAT).

## 3. Gestion Financière & Comptabilité
Centralisation de tous les flux monétaires :
- **Commission Dynamique** : Le taux de commission (par défaut 3%) est désormais configurable globalement via l'interface SuperAdmin.
- **Paiements (Payouts)** :
  - Suivi des montants Bruts, Commissions et Nets à reverser.
  - Workflow de validation : "En attente" -> "Versé".
  - Historique complet des transactions financières.
- **Statistiques Globales** : Volume total, commissions totales collectées et paiements en attente.

## 4. Configuration Système Avancée
Plus de modifications dans le code pour les réglages simples :
- **Interface de Config** : Permet au SuperAdmin de modifier les paramètres vitaux :
  - Taux de commission standard.
  - Montant minimum de versement.
  - Mode d'approbation des événements (Automatique ou Manuel).
  - Email de support global.

## 5. Audit & Sécurité
- **Audit Logs Terminés** : Chaque action critique (Modif config, Changement licence, Validation payout, Approbation d'organisateur) est enregistrée avec le timestamp, l'utilisateur responsable et le détail de l'action.
- **Rôles Hiérarchiques** : Distinction claire entre les niveaux de SuperAdmin (ex: le compte principal `sedrayiokoraz@gmail.com` avec le niveau 'god').

## 6. Accessibilité Intégrée
Conformément à votre demande, toutes les dépendances et fonctionnalités de Hi.Events ont été recodées directement en interne dans `server-node.js` et l'interface SuperAdmin pour garantir une indépendance totale vis-à-vis du dépôt source original.

---
*Fin du document - TicketMada 2024*
