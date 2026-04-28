import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Carte de statistique style néo-brutal TicketMada
/// Affiche un chiffre clé avec label et couleur d'accent
class StatCard extends StatelessWidget {
  final String value;
  final String label;
  final String emoji;
  final Color accentColor;
  final bool fullWidth;

  const StatCard({
    super.key,
    required this.value,
    required this.label,
    required this.emoji,
    required this.accentColor,
    this.fullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: fullWidth ? double.infinity : null,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: TMTheme.bgDark, width: 3),
        boxShadow: [TMTheme.brutalShadow],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icône avec fond coloré
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: accentColor,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: TMTheme.bgDark, width: 2),
                  ),
                  child: Center(
                    child: Text(emoji, style: const TextStyle(fontSize: 18)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Valeur principale
            Text(
              value,
              style: TMTheme.statValue.copyWith(color: accentColor),
            ),
            const SizedBox(height: 2),

            // Label
            Text(
              label,
              style: TMTheme.bodySM,
            ),
          ],
        ),
      ),
    );
  }
}

/// Version mini de la stat card pour la barre du scanner
class MiniStatBadge extends StatelessWidget {
  final String value;
  final String label;
  final Color color;

  const MiniStatBadge({
    super.key,
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity( 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity( 0.3), width: 1.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            value,
            style: TMTheme.labelBold.copyWith(color: color, fontSize: 14),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TMTheme.bodySM.copyWith(color: color, fontSize: 11),
          ),
        ],
      ),
    );
  }
}
