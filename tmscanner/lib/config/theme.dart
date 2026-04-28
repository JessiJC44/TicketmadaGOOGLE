import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// TicketMada Design System — TMscanner
/// Palette néo-brutale avec ombres dures et couleurs vives
class TMTheme {
  // ─── Couleurs principales ─────────────────────────────
  static const Color coral = Color(0xFFFF6B4A);
  static const Color yellow = Color(0xFFFECA57);
  static const Color mint = Color(0xFF00D9A5);
  static const Color blue = Color(0xFF4A90FF);
  static const Color purple = Color(0xFF9B59B6);
  static const Color red = Color(0xFFE74C3C);

  // ─── Couleurs de fond ─────────────────────────────────
  static const Color bgCream = Color(0xFFFAF7F2);
  static const Color bgDark = Color(0xFF1A1A1A);
  static const Color bgSidebar = Color(0xFF0F0F0F);

  // ─── Texte ────────────────────────────────────────────
  static const Color textDark = Color(0xFF1A1A1A);
  static const Color textLight = Color(0xFF666666);
  static const Color textWhite = Colors.white;

  // ─── Scan Result Colors ───────────────────────────────
  static const Color scanValidBg = Color(0xFFE8F5E9);
  static const Color scanValidBorder = Color(0xFF4CAF50);
  static const Color scanValidText = Color(0xFF2E7D32);

  static const Color scanDuplicateBg = Color(0xFFFFF3E0);
  static const Color scanDuplicateBorder = Color(0xFFFF9800);
  static const Color scanDuplicateText = Color(0xFFE65100);

  static const Color scanInvalidBg = Color(0xFFFFEBEE);
  static const Color scanInvalidBorder = Color(0xFFF44336);
  static const Color scanInvalidText = Color(0xFFC62828);

  // ─── Zone Sièges ──────────────────────────────────────
  static const Color zoneVIP = coral;
  static const Color zonePremium = yellow;
  static const Color zoneStandard = blue;
  static const Color zoneEco = mint;
  static const Color zonePit = purple;

  // ─── Ombres brutales ──────────────────────────────────
  static BoxShadow get brutalShadow => const BoxShadow(
        color: Color(0xFF1A1A1A),
        offset: Offset(4, 4),
        blurRadius: 0,
      );

  static BoxShadow get brutalShadowSmall => const BoxShadow(
        color: Color(0xFF1A1A1A),
        offset: Offset(2, 2),
        blurRadius: 0,
      );

  // ─── Bordure brutale ──────────────────────────────────
  static Border get brutalBorder => Border.all(
        color: bgDark,
        width: 3,
      );

  static Border get brutalBorderThin => Border.all(
        color: bgDark,
        width: 2,
      );

  // ─── Typographie ──────────────────────────────────────
  static TextStyle get headingXL => GoogleFonts.syne(
        fontSize: 28,
        fontWeight: FontWeight.w800,
        color: textDark,
      );

  static TextStyle get headingLG => GoogleFonts.syne(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: textDark,
      );

  static TextStyle get headingMD => GoogleFonts.syne(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: textDark,
      );

  static TextStyle get headingSM => GoogleFonts.syne(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: textDark,
      );

  static TextStyle get bodyLG => GoogleFonts.dmSans(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        color: textDark,
      );

  static TextStyle get bodyMD => GoogleFonts.dmSans(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: textDark,
      );

  static TextStyle get bodySM => GoogleFonts.dmSans(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: textLight,
      );

  static TextStyle get labelBold => GoogleFonts.dmSans(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: textDark,
      );

  static TextStyle get statValue => GoogleFonts.syne(
        fontSize: 24,
        fontWeight: FontWeight.w800,
        color: textDark,
      );

  // ─── ThemeData Material ───────────────────────────────
  static ThemeData get themeData => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: coral,
          brightness: Brightness.light,
          primary: coral,
          secondary: mint,
          error: red,
          surface: Colors.white,
          onPrimary: Colors.white,
          onSecondary: textDark,
          onError: Colors.white,
          onSurface: textDark,
        ),
        scaffoldBackgroundColor: bgCream,
        textTheme: GoogleFonts.dmSansTextTheme(),
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: textDark,
          elevation: 0,
          titleTextStyle: GoogleFonts.syne(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: textDark,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: coral,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            textStyle: GoogleFonts.syne(
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(4),
              side: const BorderSide(color: bgDark, width: 2),
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(6),
            borderSide: const BorderSide(color: bgDark, width: 2),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(6),
            borderSide: const BorderSide(color: bgDark, width: 2),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(6),
            borderSide: const BorderSide(color: coral, width: 2),
          ),
          labelStyle: GoogleFonts.dmSans(color: textLight),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      );
}
