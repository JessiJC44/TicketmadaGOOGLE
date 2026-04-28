import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../models/scan_result.dart';

/// Carte de résultat de scan QR — 3 états visuels distincts
/// ✅ VALIDE (vert) — ⚠️ DÉJÀ SCANNÉ (orange) — ❌ INVALIDE (rouge)
class ScanResultCard extends StatelessWidget {
  final ScanResult result;
  final VoidCallback? onDismiss;

  const ScanResultCard({
    super.key,
    required this.result,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onDismiss,
      child: Container(
        margin: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _backgroundColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _borderColor, width: 3),
          boxShadow: [
            BoxShadow(
              color: _borderColor.withOpacity( 0.3),
              offset: const Offset(4, 4),
              blurRadius: 0,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ─── Header avec icône et statut ─────────────
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: _borderColor.withOpacity( 0.1),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(9),
                  topRight: Radius.circular(9),
                ),
              ),
              child: Row(
                children: [
                  // Icône animée
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: _borderColor.withOpacity( 0.15),
                      borderRadius: BorderRadius.circular(28),
                    ),
                    child: Center(
                      child: Text(
                        _icon,
                        style: const TextStyle(fontSize: 28),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Titre et sous-titre
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _title,
                          style: TMTheme.headingMD.copyWith(
                            color: _textColor,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _subtitle,
                          style: TMTheme.bodySM.copyWith(
                            color: _textColor.withOpacity( 0.7),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ─── Détails du billet ───────────────────────
            if (result.status == ScanStatus.valid ||
                result.status == ScanStatus.alreadyScanned)
              Container(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    if (result.buyerName != null)
                      _buildInfoRow('👤', 'Client', result.buyerName!),
                    if (result.zone != null)
                      _buildInfoRow('📍', 'Zone', result.zone!),
                    if (result.seat != null)
                      _buildInfoRow('💺', 'Siège', result.seat!),
                    if (result.tariff != null)
                      _buildInfoRow('🏷️', 'Tarif', result.tariff!),
                    if (result.price != null)
                      _buildInfoRow(
                          '💰', 'Prix', '${result.price!.toStringAsFixed(0)} Ar'),
                    if (result.scannedAt != null)
                      _buildInfoRow('🕐', 'Scanné à',
                          '${result.scannedAt!.hour.toString().padLeft(2, '0')}:${result.scannedAt!.minute.toString().padLeft(2, '0')}'),
                    if (result.scannedBy != null &&
                        result.status == ScanStatus.alreadyScanned)
                      _buildInfoRow('📱', 'Par', result.scannedBy!),
                    if (result.rejectReason != null &&
                        result.status == ScanStatus.invalid)
                      _buildInfoRow('⚠️', 'Raison', result.rejectReason!),
                  ],
                ),
              ),

            // ─── Code billet ─────────────────────────────
            if (result.ticketCode != null)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: _borderColor.withOpacity( 0.05),
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(9),
                    bottomRight: Radius.circular(9),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '🎫 ${result.ticketCode}',
                      style: TMTheme.labelBold.copyWith(
                        color: _textColor.withOpacity( 0.6),
                        fontFamily: 'monospace',
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ─── Ligne d'info ───────────────────────────────────
  Widget _buildInfoRow(String emoji, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 16)),
          const SizedBox(width: 10),
          Text(
            '$label:',
            style: TMTheme.bodySM.copyWith(
              fontWeight: FontWeight.w600,
              color: TMTheme.textLight,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: TMTheme.bodyMD.copyWith(fontWeight: FontWeight.w600),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  // ─── Getters selon le statut ────────────────────────
  Color get _backgroundColor {
    switch (result.status) {
      case ScanStatus.valid:
        return TMTheme.scanValidBg;
      case ScanStatus.alreadyScanned:
        return TMTheme.scanDuplicateBg;
      case ScanStatus.invalid:
        return TMTheme.scanInvalidBg;
    }
  }

  Color get _borderColor {
    switch (result.status) {
      case ScanStatus.valid:
        return TMTheme.scanValidBorder;
      case ScanStatus.alreadyScanned:
        return TMTheme.scanDuplicateBorder;
      case ScanStatus.invalid:
        return TMTheme.scanInvalidBorder;
    }
  }

  Color get _textColor {
    switch (result.status) {
      case ScanStatus.valid:
        return TMTheme.scanValidText;
      case ScanStatus.alreadyScanned:
        return TMTheme.scanDuplicateText;
      case ScanStatus.invalid:
        return TMTheme.scanInvalidText;
    }
  }

  String get _icon {
    switch (result.status) {
      case ScanStatus.valid:
        return '✅';
      case ScanStatus.alreadyScanned:
        return '⚠️';
      case ScanStatus.invalid:
        return '❌';
    }
  }

  String get _title {
    switch (result.status) {
      case ScanStatus.valid:
        return 'QR Valide — Billet vérifié';
      case ScanStatus.alreadyScanned:
        return 'QR Déjà scanné';
      case ScanStatus.invalid:
        return 'QR Invalide';
    }
  }

  String get _subtitle {
    switch (result.status) {
      case ScanStatus.valid:
        return 'Accès autorisé';
      case ScanStatus.alreadyScanned:
        return 'Ce billet a déjà été scanné';
      case ScanStatus.invalid:
        return result.rejectReason ?? 'QR non reconnu pour cet événement';
    }
  }
}
