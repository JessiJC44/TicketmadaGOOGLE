/// Les 3 états possibles d'un scan QR
enum ScanStatus { valid, alreadyScanned, invalid }

/// Résultat d'un scan de billet QR
class ScanResult {
  final ScanStatus status;
  final String? ticketCode;
  final String? buyerName;
  final String? zone;
  final String? seat;
  final String? tariff;
  final double? price;
  final DateTime? scannedAt;
  final String? scannedBy;
  final String? rejectReason;
  final String? eventName;

  const ScanResult({
    required this.status,
    this.ticketCode,
    this.buyerName,
    this.zone,
    this.seat,
    this.tariff,
    this.price,
    this.scannedAt,
    this.scannedBy,
    this.rejectReason,
    this.eventName,
  });

  /// Scan valide — billet vérifié, accès autorisé
  factory ScanResult.valid({
    required String ticketCode,
    String? buyerName,
    String? zone,
    String? seat,
    String? tariff,
    double? price,
    String? eventName,
  }) {
    return ScanResult(
      status: ScanStatus.valid,
      ticketCode: ticketCode,
      buyerName: buyerName,
      zone: zone,
      seat: seat,
      tariff: tariff,
      price: price,
      scannedAt: DateTime.now(),
      eventName: eventName,
    );
  }

  /// Scan déjà utilisé — billet déjà scanné avant
  factory ScanResult.alreadyScanned({
    required String ticketCode,
    String? buyerName,
    DateTime? firstScannedAt,
    String? scannedBy,
  }) {
    return ScanResult(
      status: ScanStatus.alreadyScanned,
      ticketCode: ticketCode,
      buyerName: buyerName,
      scannedAt: firstScannedAt ?? DateTime.now(),
      scannedBy: scannedBy,
      rejectReason: 'QR déjà utilisé',
    );
  }

  /// Scan invalide — QR non reconnu
  factory ScanResult.invalid({
    String? ticketCode,
    String? rejectReason,
  }) {
    return ScanResult(
      status: ScanStatus.invalid,
      ticketCode: ticketCode,
      scannedAt: DateTime.now(),
      rejectReason: rejectReason ?? 'QR non reconnu pour cet événement',
    );
  }

  /// Depuis la réponse API du backend Node.js
  factory ScanResult.fromApiResponse(Map<String, dynamic> json, {bool isError = false, String? errorMessage}) {
    if (isError) {
      final msg = errorMessage ?? json['error'] ?? '';
      if (msg.toLowerCase().contains('déjà') || msg.toLowerCase().contains('already')) {
        return ScanResult.alreadyScanned(
          ticketCode: json['ticket_code'] ?? '',
          scannedBy: json['scanned_by'],
          firstScannedAt: json['scanned_at'] != null ? DateTime.tryParse(json['scanned_at']) : null,
        );
      }
      return ScanResult.invalid(
        ticketCode: json['ticket_code'],
        rejectReason: msg,
      );
    }

    return ScanResult.valid(
      ticketCode: json['ticket_code'] ?? json['id_code'] ?? '',
      buyerName: json['buyer_name'] ?? json['buyer'],
      zone: json['zone'] ?? json['type'],
      seat: json['seat'],
      tariff: json['tariff'] ?? json['type'],
      price: (json['price'] is num) ? (json['price'] as num).toDouble() : null,
      eventName: json['event_name'],
    );
  }

  /// Sérialisation JSON pour cache hors ligne
  Map<String, dynamic> toJson() => {
        'status': status.name,
        'ticketCode': ticketCode,
        'buyerName': buyerName,
        'zone': zone,
        'seat': seat,
        'tariff': tariff,
        'price': price,
        'scannedAt': scannedAt?.toIso8601String(),
        'scannedBy': scannedBy,
        'rejectReason': rejectReason,
        'eventName': eventName,
      };

  /// Restauration depuis le cache
  factory ScanResult.fromJson(Map<String, dynamic> json) => ScanResult(
        status: ScanStatus.values.firstWhere(
          (s) => s.name == json['status'],
          orElse: () => ScanStatus.invalid,
        ),
        ticketCode: json['ticketCode'],
        buyerName: json['buyerName'],
        zone: json['zone'],
        seat: json['seat'],
        tariff: json['tariff'],
        price: json['price'] != null ? (json['price'] as num).toDouble() : null,
        scannedAt: json['scannedAt'] != null ? DateTime.tryParse(json['scannedAt']) : null,
        scannedBy: json['scannedBy'],
        rejectReason: json['rejectReason'],
        eventName: json['eventName'],
      );
}
