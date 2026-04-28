import 'package:vibration/vibration.dart';
import 'package:audioplayers/audioplayers.dart';

/// Service de feedback haptique et sonore pour TMscanner
/// Vibration + son différents selon le résultat du scan
class HapticService {
  final AudioPlayer _player = AudioPlayer();
  bool _hasVibrator = false;

  /// Initialiser (vérifier si le device supporte la vibration)
  Future<void> initialize() async {
    try {
      _hasVibrator = await Vibration.hasVibrator() ?? false;
    } catch (_) {
      _hasVibrator = false;
    }
  }

  /// ✅ Scan VALIDE — vibration courte + beep
  Future<void> playValidScan() async {
    if (_hasVibrator) {
      Vibration.vibrate(duration: 100);
    }
    try {
      await _player.setSource(AssetSource('sounds/scan_valid.mp3'));
      await _player.resume();
    } catch (_) {
      // Son non disponible — vibration seule suffit
    }
  }

  /// ⚠️ Scan DÉJÀ UTILISÉ — double vibration + alert
  Future<void> playDuplicateScan() async {
    if (_hasVibrator) {
      Vibration.vibrate(pattern: [0, 100, 100, 100]);
    }
    try {
      await _player.setSource(AssetSource('sounds/scan_duplicate.mp3'));
      await _player.resume();
    } catch (_) {
      // Fallback silencieux
    }
  }

  /// ❌ Scan INVALIDE — vibration longue + erreur
  Future<void> playInvalidScan() async {
    if (_hasVibrator) {
      Vibration.vibrate(duration: 500);
    }
    try {
      await _player.setSource(AssetSource('sounds/scan_invalid.mp3'));
      await _player.resume();
    } catch (_) {
      // Fallback silencieux
    }
  }

  /// Feedback léger (pour les interactions UI)
  Future<void> playLightFeedback() async {
    if (_hasVibrator) {
      Vibration.vibrate(duration: 50);
    }
  }

  /// Libérer les ressources
  void dispose() {
    _player.dispose();
  }
}
