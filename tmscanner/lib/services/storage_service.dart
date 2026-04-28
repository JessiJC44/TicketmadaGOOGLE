import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../models/scan_result.dart';

/// Service de stockage local pour TMscanner
/// Gère le token, user, événement sélectionné, historique des scans
class StorageService {
  late SharedPreferences _prefs;

  /// Initialiser SharedPreferences (à appeler au démarrage)
  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // ─── Token ─────────────────────────────────────────────

  Future<void> saveToken(String token) async {
    await _prefs.setString(ApiConfig.tokenKey, token);
  }

  String? getToken() => _prefs.getString(ApiConfig.tokenKey);

  Future<void> clearToken() async {
    await _prefs.remove(ApiConfig.tokenKey);
  }

  // ─── User ──────────────────────────────────────────────

  Future<void> saveUser(Map<String, dynamic> user) async {
    await _prefs.setString(ApiConfig.userKey, jsonEncode(user));
  }

  Map<String, dynamic>? getUser() {
    final str = _prefs.getString(ApiConfig.userKey);
    if (str == null) return null;
    return jsonDecode(str);
  }

  Future<void> clearUser() async {
    await _prefs.remove(ApiConfig.userKey);
  }

  // ─── Server URL ────────────────────────────────────────

  Future<void> saveServerUrl(String url) async {
    await _prefs.setString(ApiConfig.serverUrlKey, url);
  }

  String getServerUrl() =>
      _prefs.getString(ApiConfig.serverUrlKey) ?? ApiConfig.defaultBaseUrl;

  // ─── Selected Event ────────────────────────────────────

  Future<void> saveSelectedEvent(int eventId) async {
    await _prefs.setInt(ApiConfig.selectedEventKey, eventId);
  }

  int? getSelectedEvent() => _prefs.getInt(ApiConfig.selectedEventKey);

  // ─── Scan History ──────────────────────────────────────

  Future<void> saveScanHistory(List<ScanResult> history) async {
    final jsonList = history.map((s) => s.toJson()).toList();
    await _prefs.setString(ApiConfig.scanHistoryKey, jsonEncode(jsonList));
  }

  List<ScanResult> getScanHistory() {
    final str = _prefs.getString(ApiConfig.scanHistoryKey);
    if (str == null) return [];
    final list = jsonDecode(str) as List;
    return list.map((j) => ScanResult.fromJson(j)).toList();
  }

  Future<void> addScanToHistory(ScanResult result) async {
    final history = getScanHistory();
    history.insert(0, result); // Plus récent en premier
    // Garder max 500 entrées
    if (history.length > 500) history.removeRange(500, history.length);
    await saveScanHistory(history);
  }

  Future<void> clearScanHistory() async {
    await _prefs.remove(ApiConfig.scanHistoryKey);
  }

  // ─── Event Name ────────────────────────────────────────

  Future<void> saveEventName(String name) async {
    await _prefs.setString('tmscanner-event-name', name);
  }

  String getEventName() =>
      _prefs.getString('tmscanner-event-name') ?? 'Événement';

  // ─── Device Name ───────────────────────────────────────

  Future<void> saveDeviceName(String name) async {
    await _prefs.setString(ApiConfig.deviceNameKey, name);
  }

  String getDeviceName() =>
      _prefs.getString(ApiConfig.deviceNameKey) ?? 'TMscanner Device';

  // ─── Clear All ─────────────────────────────────────────

  Future<void> clearAll() async {
    await _prefs.clear();
  }
}
