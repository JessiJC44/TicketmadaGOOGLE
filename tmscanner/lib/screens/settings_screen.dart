import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform, kIsWeb;
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../config/api_config.dart';
import '../services/storage_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late StorageService _storageService;

  String _deviceName = 'Chargement...';
  String _osInfo = 'Chargement...';
  String _serverUrl = ApiConfig.defaultBaseUrl;
  String _eventName = 'Événement';
  bool _serverConnected = false;

  late TextEditingController _deviceNameController;
  late TextEditingController _serverUrlController;

  @override
  void initState() {
    super.initState();
    _storageService = StorageService();
    _deviceNameController = TextEditingController();
    _serverUrlController = TextEditingController();
    _initSettings();
  }

  Future<void> _initSettings() async {
    await _storageService.initialize();

    final deviceName = _storageService.getDeviceName();
    final serverUrl = _storageService.getServerUrl();
    final eventName = _storageService.getEventName();

    // Get OS info
    String osInfo;
    if (kIsWeb) {
      osInfo = 'Web';
    } else {
      switch (defaultTargetPlatform) {
        case TargetPlatform.android:
          osInfo = 'Android';
          break;
        case TargetPlatform.iOS:
          osInfo = 'iOS';
          break;
        case TargetPlatform.macOS:
          osInfo = 'macOS';
          break;
        case TargetPlatform.linux:
          osInfo = 'Linux';
          break;
        case TargetPlatform.windows:
          osInfo = 'Windows';
          break;
        default:
          osInfo = 'Inconnu';
      }
    }

    setState(() {
      _deviceName = deviceName;
      _serverUrl = serverUrl;
      _eventName = eventName;
      _osInfo = osInfo;
      _deviceNameController.text = _deviceName;
      _serverUrlController.text = _serverUrl;
      _serverConnected = true;
    });
  }

  @override
  void dispose() {
    _deviceNameController.dispose();
    _serverUrlController.dispose();
    super.dispose();
  }

  Future<void> _updateDeviceName() async {
    final newName = _deviceNameController.text.trim();
    if (newName.isNotEmpty && newName != _deviceName) {
      await _storageService.saveDeviceName(newName);
      setState(() => _deviceName = newName);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Nom de l\'appareil mis à jour'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  Future<void> _updateServerUrl() async {
    final newUrl = _serverUrlController.text.trim();
    if (newUrl.isNotEmpty && newUrl != _serverUrl) {
      await _storageService.saveServerUrl(newUrl);
      setState(() => _serverUrl = newUrl);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('URL du serveur mise à jour'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  Future<void> _changeEvent() async {
    // Go back to login to reselect event
    context.go('/login');
  }

  Future<void> _logout() async {
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: TMTheme.bgCream,
        title: Text(
          'Déconnexion',
          style: TMTheme.headingMD.copyWith(
            color: TMTheme.textDark,
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Text(
          'Êtes-vous sûr de vouloir vous déconnecter?',
          style: TMTheme.bodyMD.copyWith(color: TMTheme.textDark),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Annuler',
              style: TMTheme.bodyMD.copyWith(color: TMTheme.textLight),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'Déconnecter',
              style: TMTheme.bodyMD.copyWith(
                color: Colors.red,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );

    if (shouldLogout == true && mounted) {
      await _storageService.clearAll();
      if (mounted) context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TMTheme.bgCream,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: TMTheme.textDark),
          onPressed: () => context.go('/scanner'),
        ),
        title: Text(
          'Paramètres',
          style: TMTheme.headingMD.copyWith(
            color: TMTheme.textDark,
            fontWeight: FontWeight.w700,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: TMTheme.coral, height: 3),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Appareil section
            _buildSection(
              title: 'Appareil',
              children: [
                _buildEditableSettingItem(
                  label: 'Nom de l\'appareil',
                  controller: _deviceNameController,
                  onSave: _updateDeviceName,
                ),
                _buildSettingItem(label: 'Système', value: _osInfo),
              ],
            ),
            const SizedBox(height: 24),

            // Serveur section
            _buildSection(
              title: 'Serveur',
              children: [
                _buildConnectionStatus(),
                _buildEditableSettingItem(
                  label: 'URL Serveur',
                  controller: _serverUrlController,
                  onSave: _updateServerUrl,
                  keyboardType: TextInputType.url,
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Événement section
            _buildSection(
              title: 'Événement',
              children: [
                _buildSettingItem(
                  label: 'Événement actuel',
                  value: _eventName,
                ),
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: _changeEvent,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: TMTheme.coral, width: 2),
                      borderRadius: BorderRadius.circular(8),
                      color: TMTheme.coral.withOpacity(0.1),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.edit, color: TMTheme.coral, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Changer d\'événement',
                          style: TMTheme.bodyMD.copyWith(
                            color: TMTheme.coral,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // App section
            _buildSection(
              title: 'App',
              children: [
                _buildSettingItem(
                  label: 'Version',
                  value: 'TMscanner v${ApiConfig.appVersion}',
                ),
              ],
            ),
            const SizedBox(height: 48),

            // Logout button
            _buildLogoutButton(),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required List<Widget> children,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TMTheme.headingMD.copyWith(
            color: TMTheme.textDark,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: TMTheme.bgDark, width: 3),
            borderRadius: BorderRadius.circular(8),
            color: Colors.white,
          ),
          child: Column(
            children: [
              for (int i = 0; i < children.length; i++) ...[
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: children[i],
                ),
                if (i < children.length - 1)
                  Container(
                    height: 1,
                    color: TMTheme.textLight.withOpacity(0.1),
                  ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSettingItem({
    required String label,
    required String value,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TMTheme.bodySM.copyWith(
                color: TMTheme.textLight,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TMTheme.bodyMD.copyWith(
                color: TMTheme.textDark,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildEditableSettingItem({
    required String label,
    required TextEditingController controller,
    required VoidCallback onSave,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TMTheme.bodySM.copyWith(
            color: TMTheme.textLight,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            filled: true,
            fillColor: TMTheme.bgCream,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 10,
            ),
          ),
          style: TMTheme.bodyMD.copyWith(color: TMTheme.textDark),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: GestureDetector(
            onTap: onSave,
            child: Text(
              'Enregistrer',
              style: TMTheme.bodySM.copyWith(
                color: TMTheme.coral,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildConnectionStatus() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'État de connexion',
              style: TMTheme.bodySM.copyWith(
                color: TMTheme.textLight,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _serverConnected ? Colors.green : Colors.red,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  _serverConnected ? 'Connecté' : 'Déconnecté',
                  style: TMTheme.bodyMD.copyWith(
                    color: _serverConnected ? Colors.green : Colors.red,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildLogoutButton() {
    return GestureDetector(
      onTap: _logout,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: Colors.red.shade600,
          border: Border.all(color: Colors.red.shade800, width: 3),
          boxShadow: [
            BoxShadow(
              color: Colors.red.withOpacity(0.3),
              blurRadius: 8,
              offset: const Offset(4, 4),
            ),
          ],
        ),
        child: Center(
          child: Text(
            'Déconnexion',
            style: TMTheme.headingMD.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}
