import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../services/haptic_service.dart';
import '../models/scan_result.dart';
import '../widgets/scan_result_card.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({Key? key}) : super(key: key);

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  late MobileScannerController _cameraController;
  late StorageService _storageService;
  late HapticService _hapticService;
  ApiService? _apiService;

  String _eventName = 'Événement';
  int _scanCount = 0;
  bool _torchEnabled = false;
  int _currentNavIndex = 1;

  ScanResult? _lastScanResult;
  bool _showScanOverlay = false;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _cameraController = MobileScannerController();
    _storageService = StorageService();
    _hapticService = HapticService();
    _initServices();
  }

  Future<void> _initServices() async {
    await _storageService.initialize();
    await _hapticService.initialize();

    final baseUrl = _storageService.getServerUrl();
    final token = _storageService.getToken();
    _apiService = ApiService(baseUrl: baseUrl, token: token);

    final eventName = _storageService.getEventName();
    setState(() {
      _eventName = eventName;
      _isInitialized = true;
    });
  }

  @override
  void dispose() {
    _cameraController.dispose();
    _hapticService.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) async {
    final List<Barcode> barcodes = capture.barcodes;

    for (final barcode in barcodes) {
      final String? code = barcode.rawValue;

      if (code != null && code.isNotEmpty) {
        if (_showScanOverlay) return;
        _processScan(code);
        break;
      }
    }
  }

  Future<void> _processScan(String code) async {
    if (_apiService == null) return;

    try {
      await _hapticService.playLightFeedback();

      // Call API to validate ticket
      final result = await _apiService!.scanTicket(code);

      if (!mounted) return;

      // Play appropriate feedback
      switch (result.status) {
        case ScanStatus.valid:
          await _hapticService.playValidScan();
          break;
        case ScanStatus.alreadyScanned:
          await _hapticService.playDuplicateScan();
          break;
        case ScanStatus.invalid:
          await _hapticService.playInvalidScan();
          break;
      }

      setState(() {
        _scanCount++;
        _lastScanResult = result;
        _showScanOverlay = true;
      });

      // Save to history
      await _storageService.addScanToHistory(result);

      // Show overlay for 3 seconds
      await Future.delayed(const Duration(seconds: 3));

      if (mounted) {
        setState(() => _showScanOverlay = false);
      }
    } catch (e) {
      await _hapticService.playInvalidScan();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: Colors.red.shade600,
          ),
        );
      }
    }
  }

  Future<void> _toggleTorch() async {
    setState(() => _torchEnabled = !_torchEnabled);
    await _cameraController.toggleTorch();
  }

  void _handleNavigation(int index) {
    setState(() => _currentNavIndex = index);

    switch (index) {
      case 0:
        context.go('/history');
        break;
      case 1:
        break; // Already on scanner
      case 2:
        context.go('/stats');
        break;
      case 3:
        context.go('/settings');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Camera view
          if (_isInitialized)
            MobileScanner(
              controller: _cameraController,
              onDetect: _onDetect,
            )
          else
            const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),

          // Top bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.7),
                  border: const Border(
                    bottom: BorderSide(color: TMTheme.coral, width: 3),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _eventName,
                      style: TMTheme.bodyMD.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: TMTheme.coral,
                        border: Border.all(color: TMTheme.bgDark, width: 3),
                      ),
                      child: Text(
                        '$_scanCount scans',
                        style: TMTheme.bodyMD.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Scan frame overlay
          Center(
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                border: Border.all(color: TMTheme.coral, width: 4),
              ),
            ),
          ),

          // Torch toggle button
          Positioned(
            top: 120,
            right: 16,
            child: SafeArea(
              child: FloatingActionButton(
                onPressed: _toggleTorch,
                backgroundColor: TMTheme.coral,
                shape: RoundedRectangleBorder(
                  side: const BorderSide(color: Colors.white, width: 3),
                  borderRadius: BorderRadius.circular(28),
                ),
                child: Icon(
                  _torchEnabled ? Icons.flash_on : Icons.flash_off,
                  color: Colors.white,
                  size: 24,
                ),
              ),
            ),
          ),

          // Scan result overlay card
          if (_showScanOverlay && _lastScanResult != null)
            Positioned(
              bottom: 100,
              left: 16,
              right: 16,
              child: ScanResultCard(
                result: _lastScanResult!,
                onDismiss: () {
                  setState(() => _showScanOverlay = false);
                },
              ),
            ),

          // Bottom navigation bar
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _buildBottomNavigation(),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNavigation() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.9),
        border: const Border(
          top: BorderSide(color: TMTheme.coral, width: 3),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildNavItem(index: 0, icon: Icons.history, label: 'Historique'),
            _buildNavItem(index: 1, icon: Icons.qr_code_scanner, label: 'Scanner'),
            _buildNavItem(index: 2, icon: Icons.bar_chart, label: 'Stats'),
            _buildNavItem(index: 3, icon: Icons.settings, label: 'Paramètres'),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required String label,
  }) {
    final isActive = _currentNavIndex == index;

    return GestureDetector(
      onTap: () => _handleNavigation(index),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isActive ? TMTheme.coral : Colors.white.withOpacity(0.5),
              size: 28,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TMTheme.bodySM.copyWith(
                color: isActive ? TMTheme.coral : Colors.white.withOpacity(0.5),
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
