/// Configuration API pour TMscanner
/// Se connecte au backend Node.js de TicketMada
class ApiConfig {
  /// URL par défaut du serveur backend (avec trailing slash pour Dio)
  static const String defaultBaseUrl = 'http://localhost:8000/api/';

  /// Timeout pour les requêtes HTTP (ms)
  static const int connectTimeout = 10000;
  static const int receiveTimeout = 15000;

  /// Endpoints API (sans / initial pour que Dio les ajoute après baseUrl)
  static const String authLogin = 'auth/login';
  static const String authMe = 'auth/me';
  static const String authLogout = 'auth/logout';
  static const String events = 'events';
  static const String ticketScan = 'tickets'; // PUT tickets/:id/scan
  static const String ticketStats = 'tickets/stats';

  /// Clés de stockage local
  static const String tokenKey = 'ticketmada-token';
  static const String userKey = 'ticketmada-user';
  static const String serverUrlKey = 'tmscanner-server-url';
  static const String selectedEventKey = 'tmscanner-selected-event';
  static const String scanHistoryKey = 'tmscanner-scan-history';
  static const String deviceNameKey = 'tmscanner-device-name';

  /// Intervalle de rafraîchissement des stats (secondes)
  static const int statsRefreshInterval = 10;

  /// Durée d'affichage du résultat de scan (millisecondes)
  static const int scanResultDisplayDuration = 3000;

  /// Version de l'app
  static const String appVersion = '1.0.0';
  static const String appName = 'TMscanner';
}
