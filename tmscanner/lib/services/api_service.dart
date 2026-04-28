import 'package:dio/dio.dart';
import '../config/api_config.dart';
import '../models/event.dart';
import '../models/scan_result.dart';

/// Service API pour TMscanner
/// Se connecte au backend Node.js de TicketMada via Bearer token
class ApiService {
  late final Dio _dio;
  String? _token;

  ApiService({required String baseUrl, String? token}) {
    _token = token;
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(milliseconds: ApiConfig.connectTimeout),
      receiveTimeout: const Duration(milliseconds: ApiConfig.receiveTimeout),
      headers: {'Content-Type': 'application/json'},
    ));

    // Intercepteur pour ajouter le token automatiquement
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_token != null) {
          options.headers['Authorization'] = 'Bearer $_token';
        }
        handler.next(options);
      },
    ));
  }

  // ─── Auth ──────────────────────────────────────────────

  /// Connexion — retourne {token, user}
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _dio.post(ApiConfig.authLogin, data: {
        'email': email,
        'password': password,
      });
      final data = response.data;
      if (data['token'] != null) {
        _token = data['token'];
      }
      return data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Vérifier la session courante
  Future<Map<String, dynamic>> getMe() async {
    try {
      final response = await _dio.get(ApiConfig.authMe);
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // ─── Événements ────────────────────────────────────────

  /// Liste des événements
  Future<List<Event>> getEvents() async {
    try {
      final response = await _dio.get(ApiConfig.events);
      final data = response.data;
      final list = data is List ? data : (data['events'] ?? data);
      if (list is List) {
        return list.map((e) => Event.fromJson(e)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // ─── Scan ──────────────────────────────────────────────

  /// Scanner un billet — PUT /api/tickets/{idCode}/scan
  Future<ScanResult> scanTicket(String ticketIdCode) async {
    try {
      final response = await _dio.put(
        '${ApiConfig.ticketScan}/$ticketIdCode/scan',
      );
      return ScanResult.fromApiResponse(response.data);
    } on DioException catch (e) {
      if (e.response != null) {
        final data = e.response!.data;
        final msg = data is Map ? (data['error'] ?? data['message'] ?? '') : e.message ?? '';

        if (e.response!.statusCode == 400 || msg.toString().toLowerCase().contains('déjà')) {
          return ScanResult.alreadyScanned(
            ticketCode: ticketIdCode,
            scannedBy: data is Map ? data['scanned_by'] : null,
          );
        }
        if (e.response!.statusCode == 404) {
          return ScanResult.invalid(
            ticketCode: ticketIdCode,
            rejectReason: 'Billet non trouvé',
          );
        }
        return ScanResult.invalid(
          ticketCode: ticketIdCode,
          rejectReason: msg.toString(),
        );
      }
      return ScanResult.invalid(
        ticketCode: ticketIdCode,
        rejectReason: 'Erreur réseau — vérifiez la connexion',
      );
    }
  }

  // ─── Stats ─────────────────────────────────────────────

  /// Statistiques des billets (optionnel: par événement)
  Future<Map<String, dynamic>> getStats({int? eventId}) async {
    try {
      String url = ApiConfig.ticketStats;
      if (eventId != null) url += '?event_id=$eventId';
      final response = await _dio.get(url);
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // ─── Token management ──────────────────────────────────

  void setToken(String token) => _token = token;
  void clearToken() => _token = null;
  String? get token => _token;

  /// Met à jour l'URL de base
  void updateBaseUrl(String newUrl) {
    _dio.options.baseUrl = newUrl;
  }

  // ─── Gestion d'erreurs ─────────────────────────────────

  Exception _handleError(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.connectionError) {
      return Exception('Impossible de se connecter au serveur');
    }
    if (e.response?.statusCode == 401) {
      return Exception('Session expirée — reconnectez-vous');
    }
    if (e.response?.statusCode == 403) {
      return Exception('Accès non autorisé');
    }
    if (e.response?.statusCode == 404) {
      return Exception('Ressource non trouvée');
    }
    final msg = e.response?.data is Map
        ? e.response!.data['error'] ?? e.response!.data['message']
        : null;
    return Exception(msg ?? 'Erreur serveur');
  }
}
