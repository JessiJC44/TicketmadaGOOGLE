/// Modèle de billet TicketMada
class Ticket {
  final int id;
  final String idCode;
  final int eventId;
  final String? buyerName;
  final String type; // VIP, Standard, Tribune, Économique
  final int price;
  final String status; // active, scanned, refunded
  final DateTime? scannedAt;

  const Ticket({
    required this.id,
    required this.idCode,
    required this.eventId,
    this.buyerName,
    this.type = 'Standard',
    this.price = 0,
    this.status = 'active',
    this.scannedAt,
  });

  bool get isScanned => status == 'scanned';
  bool get isValid => status == 'active';
  bool get isRefunded => status == 'refunded';

  String get formattedPrice => '${price.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (m) => '${m[1]} ',
      )} Ar';

  factory Ticket.fromJson(Map<String, dynamic> json) => Ticket(
        id: json['id'] ?? 0,
        idCode: json['id_code'] ?? json['idCode'] ?? 'TKT-000',
        eventId: json['event_id'] ?? json['eventId'] ?? 0,
        buyerName: json['buyer_name'] ?? json['buyerName'],
        type: json['type'] ?? 'Standard',
        price: json['price'] ?? 0,
        status: json['status'] ?? 'active',
        scannedAt: json['scanned_at'] != null
            ? DateTime.tryParse(json['scanned_at'])
            : null,
      );
}
