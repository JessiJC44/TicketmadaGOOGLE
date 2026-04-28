import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../services/storage_service.dart';
import '../models/scan_result.dart';

enum FilterStatus { all, valid, invalid }

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({Key? key}) : super(key: key);

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  late StorageService _storageService;

  List<ScanResult> _allScans = [];
  FilterStatus _filterStatus = FilterStatus.all;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _storageService = StorageService();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);

    try {
      await _storageService.initialize();
      final scans = _storageService.getScanHistory();
      setState(() {
        _allScans = scans;
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

  List<ScanResult> get _filteredScans {
    switch (_filterStatus) {
      case FilterStatus.valid:
        return _allScans.where((s) => s.status == ScanStatus.valid).toList();
      case FilterStatus.invalid:
        return _allScans
            .where((s) =>
                s.status == ScanStatus.invalid ||
                s.status == ScanStatus.alreadyScanned)
            .toList();
      case FilterStatus.all:
        return _allScans;
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
          'Historique des scans',
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
      body: RefreshIndicator(
        onRefresh: _loadHistory,
        color: TMTheme.coral,
        child: Column(
          children: [
            // Filter chips
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip(
                      label: 'Tous',
                      isActive: _filterStatus == FilterStatus.all,
                      onTap: () =>
                          setState(() => _filterStatus = FilterStatus.all),
                    ),
                    const SizedBox(width: 8),
                    _buildFilterChip(
                      label: 'Valides',
                      isActive: _filterStatus == FilterStatus.valid,
                      color: Colors.green,
                      onTap: () =>
                          setState(() => _filterStatus = FilterStatus.valid),
                    ),
                    const SizedBox(width: 8),
                    _buildFilterChip(
                      label: 'Rejetés',
                      isActive: _filterStatus == FilterStatus.invalid,
                      color: Colors.red,
                      onTap: () =>
                          setState(() => _filterStatus = FilterStatus.invalid),
                    ),
                  ],
                ),
              ),
            ),
            // Scan list
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        valueColor:
                            AlwaysStoppedAnimation<Color>(TMTheme.coral),
                      ),
                    )
                  : _filteredScans.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.inbox,
                                size: 64,
                                color: TMTheme.textLight.withOpacity(0.5),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'Aucun scan enregistré',
                                style: TMTheme.bodyMD
                                    .copyWith(color: TMTheme.textLight),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _filteredScans.length,
                          itemBuilder: (context, index) {
                            final scan = _filteredScans[index];
                            return _buildScanListItem(scan);
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required bool isActive,
    Color color = const Color(0xFF4A5568),
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? color : Colors.white,
          border: Border.all(color: color, width: 2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TMTheme.bodyMD.copyWith(
            color: isActive ? Colors.white : color,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildScanListItem(ScanResult scan) {
    final isValid = scan.status == ScanStatus.valid;
    final isDuplicate = scan.status == ScanStatus.alreadyScanned;
    final icon = isValid
        ? Icons.check_circle
        : isDuplicate
            ? Icons.warning
            : Icons.error;
    final iconColor = isValid
        ? Colors.green.shade600
        : isDuplicate
            ? Colors.orange.shade600
            : Colors.red.shade600;
    final statusLabel = isValid
        ? 'Valide'
        : isDuplicate
            ? 'Doublon'
            : 'Rejeté';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        border: Border.all(
          color: TMTheme.textLight.withOpacity(0.2),
          width: 2,
        ),
        borderRadius: BorderRadius.circular(8),
        color: Colors.white,
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(12),
        leading: Icon(icon, color: iconColor, size: 28),
        title: Text(
          scan.buyerName ?? scan.ticketCode ?? 'Inconnu',
          style: TMTheme.bodyMD.copyWith(
            color: TMTheme.textDark,
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            if (scan.scannedAt != null)
              Text(
                _formatTime(scan.scannedAt!),
                style: TMTheme.bodySM.copyWith(color: TMTheme.textLight),
              ),
            if (scan.zone != null) ...[
              const SizedBox(height: 4),
              Text(
                'Zone: ${scan.zone}',
                style: TMTheme.bodySM.copyWith(color: TMTheme.textLight),
              ),
            ],
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: isValid
                ? Colors.green.shade100
                : isDuplicate
                    ? Colors.orange.shade100
                    : Colors.red.shade100,
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            statusLabel,
            style: TMTheme.bodySM.copyWith(
              color: iconColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'À l\'instant';
    } else if (difference.inMinutes < 60) {
      return 'Il y a ${difference.inMinutes} min';
    } else if (difference.inHours < 24) {
      return 'Il y a ${difference.inHours}h';
    } else {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year} ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
    }
  }
}
