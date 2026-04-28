import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'dart:async';
import '../config/theme.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class StatsScreen extends StatefulWidget {
  const StatsScreen({Key? key}) : super(key: key);

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen> {
  late StorageService _storageService;
  ApiService? _apiService;
  Timer? _autoRefreshTimer;

  String _eventName = 'Événement';
  int _totalSold = 0;
  int _arrived = 0;
  int _pending = 0;
  int _rejected = 0;
  double _arrivalRate = 0.0;

  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _storageService = StorageService();
    _initAndLoad();
  }

  Future<void> _initAndLoad() async {
    await _storageService.initialize();

    final baseUrl = _storageService.getServerUrl();
    final token = _storageService.getToken();
    _apiService = ApiService(baseUrl: baseUrl, token: token);

    setState(() {
      _eventName = _storageService.getEventName();
    });

    await _loadStats();

    // Auto-refresh every 10 seconds
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted) _loadStats();
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadStats() async {
    if (_apiService == null) return;

    try {
      final eventId = _storageService.getSelectedEvent();
      final data = await _apiService!.getStats(eventId: eventId);

      if (!mounted) return;

      final total = data['total_sold'] ?? data['total'] ?? 0;
      final arrivedCount = data['arrived'] ?? data['scanned'] ?? 0;
      final rejectedCount = data['rejected'] ?? 0;
      final pendingCount = total - arrivedCount - rejectedCount;
      final rate = total > 0 ? (arrivedCount / total) * 100 : 0.0;

      setState(() {
        _totalSold = total is int ? total : (total as num).toInt();
        _arrived = arrivedCount is int ? arrivedCount : (arrivedCount as num).toInt();
        _rejected = rejectedCount is int ? rejectedCount : (rejectedCount as num).toInt();
        _pending = pendingCount is int ? pendingCount : (pendingCount as num).toInt();
        _arrivalRate = rate is double ? rate : (rate as num).toDouble();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
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
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Statistiques',
              style: TMTheme.headingMD.copyWith(
                color: TMTheme.textDark,
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              _eventName,
              style: TMTheme.bodySM.copyWith(color: TMTheme.textLight),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: TMTheme.coral, height: 3),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadStats,
        color: TMTheme.coral,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: _isLoading
              ? SizedBox(
                  height: MediaQuery.of(context).size.height - 200,
                  child: const Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(TMTheme.coral),
                    ),
                  ),
                )
              : Column(
                  children: [
                    // Main stats grid
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 16,
                      crossAxisSpacing: 16,
                      childAspectRatio: 1.0,
                      children: [
                        _buildStatCard(
                          label: 'Billets vendus',
                          value: _totalSold.toString(),
                          color: Colors.blue,
                          icon: '\u{1F3AB}',
                        ),
                        _buildStatCard(
                          label: 'Arrivés',
                          value: _arrived.toString(),
                          color: TMTheme.mint,
                          icon: '\u2705',
                        ),
                        _buildStatCard(
                          label: 'En attente',
                          value: _pending.toString(),
                          color: Colors.amber,
                          icon: '\u23F3',
                        ),
                        _buildStatCard(
                          label: 'Rejetés',
                          value: _rejected.toString(),
                          color: Colors.red,
                          icon: '\u274C',
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Arrival rate card
                    _buildArrivalRateCard(),

                    const SizedBox(height: 24),

                    // Summary
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        border: Border.all(color: TMTheme.bgDark, width: 3),
                        borderRadius: BorderRadius.circular(8),
                        color: Colors.white,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Résumé',
                            style: TMTheme.headingMD.copyWith(
                              color: TMTheme.textDark,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 16),
                          _buildInfoRow(
                            label: 'Taux d\'arrivée',
                            value: '${_arrivalRate.toStringAsFixed(1)}%',
                          ),
                          const SizedBox(height: 12),
                          _buildInfoRow(
                            label: 'Présence / Total',
                            value: '$_arrived / $_totalSold',
                          ),
                          const SizedBox(height: 12),
                          _buildInfoRow(
                            label: 'En attente / Total',
                            value: '$_pending / $_totalSold',
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required String label,
    required String value,
    required Color color,
    required String icon,
  }) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: color, width: 3),
        borderRadius: BorderRadius.circular(8),
        color: color.withOpacity(0.1),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.2),
            blurRadius: 8,
            offset: const Offset(3, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(icon, style: const TextStyle(fontSize: 40)),
            const SizedBox(height: 12),
            Text(value, style: TMTheme.statValue.copyWith(color: color)),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TMTheme.bodySM.copyWith(
                color: TMTheme.textLight,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildArrivalRateCard() {
    final progressValue = _arrivalRate / 100.0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border.all(color: TMTheme.coral, width: 3),
        borderRadius: BorderRadius.circular(8),
        color: TMTheme.coral.withOpacity(0.08),
        boxShadow: [
          BoxShadow(
            color: TMTheme.coral.withOpacity(0.2),
            blurRadius: 8,
            offset: const Offset(3, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Taux d\'arrivée',
                style: TMTheme.headingMD.copyWith(
                  color: TMTheme.textDark,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(
                '${_arrivalRate.toStringAsFixed(1)}%',
                style: TMTheme.statValue.copyWith(
                  color: TMTheme.coral,
                  fontSize: 32,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: LinearProgressIndicator(
              value: progressValue.clamp(0.0, 1.0),
              minHeight: 12,
              backgroundColor: TMTheme.textLight.withOpacity(0.2),
              valueColor: const AlwaysStoppedAnimation<Color>(TMTheme.coral),
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border.all(
                color: TMTheme.coral.withOpacity(0.3),
                width: 2,
              ),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    Text(
                      _arrived.toString(),
                      style: TMTheme.bodyMD.copyWith(
                        color: TMTheme.coral,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      'Arrivés',
                      style: TMTheme.bodySM.copyWith(color: TMTheme.textLight),
                    ),
                  ],
                ),
                Column(
                  children: [
                    Text(
                      _totalSold.toString(),
                      style: TMTheme.bodyMD.copyWith(
                        color: TMTheme.coral,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      'Total',
                      style: TMTheme.bodySM.copyWith(color: TMTheme.textLight),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow({
    required String label,
    required String value,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TMTheme.bodyMD.copyWith(color: TMTheme.textLight),
        ),
        Text(
          value,
          style: TMTheme.bodyMD.copyWith(
            color: TMTheme.textDark,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}
