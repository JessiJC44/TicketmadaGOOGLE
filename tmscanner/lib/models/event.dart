/// Modèle d'événement TicketMada
class Event {
  final int id;
  final String name;
  final String? category;
  final String? dateStart;
  final String? venue;
  final int capacity;
  final int ticketsSold;
  final String? status;
  final String? scanLink;

  const Event({
    required this.id,
    required this.name,
    this.category,
    this.dateStart,
    this.venue,
    this.capacity = 0,
    this.ticketsSold = 0,
    this.status,
    this.scanLink,
  });

  /// Taux de remplissage (0-100)
  double get fillRate =>
      capacity > 0 ? (ticketsSold / capacity * 100) : 0;

  /// Places restantes
  int get remainingCapacity => capacity - ticketsSold;

  /// Depuis la réponse API
  factory Event.fromJson(Map<String, dynamic> json) => Event(
        id: json['id'] ?? 0,
        name: json['name'] ?? '',
        category: json['category'],
        dateStart: json['date_start'] ?? json['dateStart'],
        venue: json['venue'],
        capacity: json['capacity'] ?? 0,
        ticketsSold: json['tickets_sold'] ?? json['ticketsSold'] ?? 0,
        status: json['status'],
        scanLink: json['scan_link'] ?? json['scanLink'],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'category': category,
        'dateStart': dateStart,
        'venue': venue,
        'capacity': capacity,
        'ticketsSold': ticketsSold,
        'status': status,
        'scanLink': scanLink,
      };
}
