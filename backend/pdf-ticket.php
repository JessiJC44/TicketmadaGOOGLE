<?php
require_once __DIR__ . '/config.php';

function generateTicketPDF($ticketId) {
    $db = getDB();
    $stmt = $db->prepare('SELECT t.*, e.name as event_name, e.date_start, e.venue, u.name as buyer_name FROM tickets t LEFT JOIN events e ON t.event_id = e.id LEFT JOIN users u ON t.buyer_id = u.id WHERE t.id = ? OR t.id_code = ?');
    $stmt->execute([$ticketId, $ticketId]);
    $ticket = $stmt->fetch();

    if (!$ticket) {
        die('Billet non trouvé');
    }

    // In a real environment, we would use a library like FPDF or TCPDF here.
    // For this simulation, we'll output a "PDF-like" HTML page that looks like a ticket.
    
    header('Content-Type: text/html');
    // header('Content-Disposition: attachment; filename="ticket-' . $ticket['id_code'] . '.pdf"'); 
    
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>Billet TicketMada - <?php echo $ticket['id_code']; ?></title>
        <style>
            body { font-family: 'Syne', sans-serif; background: #f0f0f0; padding: 40px; }
            .ticket { background: white; border: 4px solid #1a1a1a; max-width: 600px; margin: 0 auto; display: flex; box-shadow: 10px 10px 0px #1a1a1a; }
            .ticket-main { flex: 1; padding: 30px; border-right: 2px dashed #1a1a1a; }
            .ticket-stub { width: 150px; padding: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #FF6B4A; color: white; }
            .event-name { font-size: 24px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; }
            .event-info { font-size: 14px; margin-bottom: 5px; }
            .buyer-name { margin-top: 20px; font-weight: 700; border-top: 2px solid #eee; padding-top: 10px; }
            .ticket-code { font-family: monospace; font-size: 18px; font-weight: 800; margin-top: 20px; text-align: center; }
            .qr-placeholder { width: 100px; height: 100px; background: white; margin-bottom: 10px; border: 2px solid #1a1a1a; display: flex; align-items: center; justify-content: center; }
        </style>
    </head>
    <body>
        <div class="ticket">
            <div class="ticket-main">
                <div class="event-name"><?php echo htmlspecialchars($ticket['event_name']); ?></div>
                <div class="event-info">📅 <?php echo date('d/m/Y H:i', strtotime($ticket['date_start'])); ?></div>
                <div class="event-info">📍 <?php echo htmlspecialchars($ticket['venue']); ?></div>
                <div class="buyer-name">PASS: <?php echo htmlspecialchars($ticket['buyer_name']); ?></div>
                <div class="event-info">Type: <?php echo htmlspecialchars($ticket['type']); ?></div>
                <div class="ticket-code"><?php echo $ticket['id_code']; ?></div>
            </div>
            <div class="ticket-stub">
                <div class="qr-placeholder">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=<?php echo urlencode($ticket['id_code']); ?>" />
                </div>
                <div style="font-size: 10px; text-align: center;">SCANNEZ-MOI À L'ENTRÉE</div>
            </div>
        </div>
        <div style="text-align: center; margin-top: 30px;">
            <button onclick="window.print()">Imprimer mon billet</button>
        </div>
    </body>
    </html>
    <?php
    exit;
}
