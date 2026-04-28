import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../config/api_config.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../models/event.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late TextEditingController _serverUrlController;
  late TextEditingController _emailController;
  late TextEditingController _passwordController;

  bool _isLoading = false;
  bool _showPassword = false;
  String? _errorMessage;
  List<Event> _events = [];
  int? _selectedEventId;
  bool _isLoggedIn = false;

  late StorageService _storageService;
  ApiService? _apiService;

  @override
  void initState() {
    super.initState();
    _serverUrlController = TextEditingController(text: ApiConfig.defaultBaseUrl);
    _emailController = TextEditingController();
    _passwordController = TextEditingController();
    _storageService = StorageService();
    _initStorage();
  }

  Future<void> _initStorage() async {
    await _storageService.initialize();
    final savedUrl = _storageService.getServerUrl();
    _serverUrlController.text = savedUrl;
  }

  @override
  void dispose() {
    _serverUrlController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      var baseUrl = _serverUrlController.text.trim();
      // Dio exige un trailing slash pour garder le path du baseUrl
      if (!baseUrl.endsWith('/')) baseUrl += '/';
      _apiService = ApiService(baseUrl: baseUrl);

      // Attempt login
      final response = await _apiService!.login(
        _emailController.text.trim(),
        _passwordController.text,
      );

      if (!mounted) return;

      // Save credentials
      final token = response['token'];
      if (token != null) {
        await _storageService.saveToken(token);
        await _storageService.saveServerUrl(baseUrl);

        if (response['user'] != null) {
          await _storageService.saveUser(response['user']);
        }

        // Fetch events
        await _fetchEvents();
      } else {
        setState(() {
          _errorMessage = response['message'] ?? 'Erreur de connexion';
          _isLoading = false;
        });
      }
    } catch (e, stackTrace) {
      debugPrint('LOGIN ERROR: $e');
      debugPrint('STACK: $stackTrace');
      setState(() {
        _errorMessage = 'Erreur: $e\n\nURL: ${_serverUrlController.text.trim()}';
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchEvents() async {
    try {
      final events = await _apiService!.getEvents();

      if (!mounted) return;

      setState(() {
        _events = events;
        _isLoggedIn = true;
        _isLoading = false;
        if (_events.isNotEmpty) {
          _selectedEventId = _events.first.id;
        }
      });

      if (_events.isEmpty) {
        setState(() {
          _errorMessage = 'Aucun événement disponible';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Erreur chargement événements: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _selectEvent() async {
    if (_selectedEventId == null) return;

    setState(() => _isLoading = true);

    try {
      final selectedEvent = _events.firstWhere(
        (e) => e.id == _selectedEventId,
      );

      await _storageService.saveSelectedEvent(_selectedEventId!);
      await _storageService.saveEventName(selectedEvent.name);

      if (!mounted) return;
      context.go('/scanner');
    } catch (e) {
      setState(() {
        _errorMessage = 'Erreur lors de la sélection: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TMTheme.bgCream,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              const SizedBox(height: 32),
              const Text('\u{1F3AB}', style: TextStyle(fontSize: 80)),
              const SizedBox(height: 16),
              Text(
                'TMscanner',
                style: TMTheme.headingXL.copyWith(
                  color: TMTheme.textDark,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'TicketMada Access Control',
                style: TMTheme.bodyMD.copyWith(color: TMTheme.textLight),
              ),
              const SizedBox(height: 48),

              // Event selector (after login)
              if (_isLoggedIn && _events.isNotEmpty && !_isLoading) ...[
                Text(
                  'Sélectionnez un événement',
                  style: TMTheme.headingMD.copyWith(color: TMTheme.textDark),
                ),
                const SizedBox(height: 16),
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: TMTheme.bgDark, width: 3),
                    borderRadius: BorderRadius.circular(8),
                    color: Colors.white,
                  ),
                  child: DropdownButton<int>(
                    value: _selectedEventId,
                    isExpanded: true,
                    underline: const SizedBox(),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    items: _events.map((event) {
                      return DropdownMenuItem<int>(
                        value: event.id,
                        child: Text(event.name),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() => _selectedEventId = value);
                    },
                  ),
                ),
                const SizedBox(height: 24),
                _buildBrutalButton(
                  label: 'Continuer',
                  onPressed: _selectEvent,
                ),
              ] else ...[
                // Login form
                _buildTextField(
                  controller: _serverUrlController,
                  label: 'URL Serveur',
                  hint: 'http://localhost:8000/api',
                  keyboardType: TextInputType.url,
                ),
                const SizedBox(height: 20),
                _buildTextField(
                  controller: _emailController,
                  label: 'Email',
                  hint: 'votre@email.com',
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 20),
                _buildTextField(
                  controller: _passwordController,
                  label: 'Mot de passe',
                  hint: 'Entrez votre mot de passe',
                  obscureText: !_showPassword,
                  suffixIcon: IconButton(
                    icon: Icon(
                      _showPassword ? Icons.visibility : Icons.visibility_off,
                      color: TMTheme.textLight,
                    ),
                    onPressed: () {
                      setState(() => _showPassword = !_showPassword);
                    },
                  ),
                ),
                const SizedBox(height: 32),
                if (_errorMessage != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.red.shade300),
                      borderRadius: BorderRadius.circular(8),
                      color: Colors.red.shade50,
                    ),
                    child: Text(
                      _errorMessage!,
                      style: TMTheme.bodyMD.copyWith(
                        color: Colors.red.shade700,
                      ),
                    ),
                  ),
                _buildBrutalButton(
                  label: 'Se connecter',
                  onPressed: _isLoading ? null : _handleLogin,
                  isLoading: _isLoading,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    bool obscureText = false,
    Widget? suffixIcon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TMTheme.bodyMD.copyWith(
            color: TMTheme.textDark,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TMTheme.bodyMD.copyWith(color: TMTheme.textLight),
            filled: true,
            fillColor: Colors.white,
            suffixIcon: suffixIcon,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 14,
            ),
          ),
          style: TMTheme.bodyMD.copyWith(color: TMTheme.textDark),
        ),
      ],
    );
  }

  Widget _buildBrutalButton({
    required String label,
    required VoidCallback? onPressed,
    bool isLoading = false,
  }) {
    return GestureDetector(
      onTap: isLoading ? null : onPressed,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: isLoading ? TMTheme.coral.withOpacity(0.7) : TMTheme.coral,
          border: Border.all(color: TMTheme.bgDark, width: 3),
          boxShadow: [TMTheme.brutalShadow],
        ),
        child: Center(
          child: isLoading
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    strokeWidth: 2,
                  ),
                )
              : Text(
                  label,
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
