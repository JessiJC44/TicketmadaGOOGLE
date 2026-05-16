const Database = require('better-sqlite3');
try {
    const db = new Database(':memory:');
    console.log('SQLite works!');
    db.close();
} catch (e) {
    console.error('SQLite failed:', e.message);
    process.exit(1);
}
