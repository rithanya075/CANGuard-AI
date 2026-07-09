# ============================================================
#  logger.py
#  Role : Logs every CAN message and every alert to SQLite DB
# ============================================================
#
#  WHY SQLITE INSTEAD OF CSV?
#  ---------------------------
#  SQLite is a file-based database — no server needed, no installation.
#  It's just one file: logs/can_ids.db
#  Advantages over CSV for this project:
#    - We can query it: "show me all FLOOD alerts in the last 5 minutes"
#    - Two tables can link to each other (traffic ↔ alerts)
#    - No risk of a half-written row if the program crashes
#    - The dashboard (Phase 4) can query it easily with SQL
#
#  DATABASE SCHEMA:
#  ----------------
#  Table 1: traffic
#    id          — auto-incrementing row number
#    timestamp   — when the message arrived (ISO format string)
#    source_node — 'NODE1' or 'NODE2'
#    can_id      — message ID in hex string e.g. '0x100'
#    counter     — the sequence counter from bytes 0-1
#    data_bytes  — all 8 bytes as a hex string e.g. '00 01 0B B8 DE AD BE EF'
#    attack_type — NULL if clean, or 'FLOOD'/'REPLAY'/'SPOOF'
#    is_alert    — 0 (clean) or 1 (attack detected)
#
#  Table 2: alerts
#    id          — auto-incrementing row number
#    timestamp   — when the alert was raised
#    attack_type — 'FLOOD', 'REPLAY', or 'SPOOF'
#    confidence  — 'LOW', 'MEDIUM', or 'HIGH'
#    can_id      — which CAN ID triggered the alert
#    details     — full human-readable explanation
#    traffic_id  — foreign key linking to the traffic table row
#
# ============================================================

import sqlite3      # built into Python — no pip install needed
import os
import datetime


# Path to the SQLite database file
# Stored in the logs/ folder next to the ids/ folder
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'logs', 'can_ids.db')
print("DATABASE:", os.path.abspath(DB_PATH))


class Logger:
    """
    Handles all database operations for the CAN IDS.

    Usage:
        log = Logger()
        traffic_id = log.log_traffic(...)
        log.log_alert(..., traffic_id=traffic_id)
        log.close()
    """

    def __init__(self, db_path: str = DB_PATH):
        """
        Open (or create) the SQLite database and set up tables.

        sqlite3.connect() creates the file if it doesn't exist yet.
        So the first time you run the program, logs/can_ids.db is
        created automatically.
        """
        # Make sure the logs/ directory exists
        os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)

        self.db_path = db_path

        # Connect to the database file
        # check_same_thread=False allows the connection to be used
        # from the Flask dashboard thread as well
        self.conn = sqlite3.connect(db_path, check_same_thread=False)

        # A cursor is what we use to run SQL commands
        self.cursor = self.conn.cursor()

        # Create tables if they don't already exist
        self._create_tables()

        print(f"[LOGGER] Database ready at: {os.path.abspath(db_path)}")

    # ------------------------------------------------------------------
    #  TABLE SETUP
    # ------------------------------------------------------------------
    def _create_tables(self):
        """
        Create the traffic and alerts tables.
        'IF NOT EXISTS' means this is safe to call every time —
        it won't delete existing data.
        """

        # --- TRAFFIC TABLE ---
        # Stores every single CAN message received, clean or not
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS traffic (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp   TEXT    NOT NULL,
                source_node TEXT    NOT NULL,
                can_id      TEXT    NOT NULL,
                counter     INTEGER,
                data_bytes  TEXT    NOT NULL,
                attack_type TEXT,
                is_alert    INTEGER NOT NULL DEFAULT 0
            )
        ''')
        # INTEGER PRIMARY KEY AUTOINCREMENT → SQLite auto-assigns row numbers
        # TEXT NOT NULL → must have a value, stored as a string
        # DEFAULT 0 → is_alert starts as 0 (false) unless we say otherwise

        # --- ALERTS TABLE ---
        # Stores only the messages that triggered an attack detection
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp   TEXT    NOT NULL,
                attack_type TEXT    NOT NULL,
                confidence  TEXT    NOT NULL,
                can_id      TEXT    NOT NULL,
                details     TEXT    NOT NULL,
                traffic_id  INTEGER,
                FOREIGN KEY (traffic_id) REFERENCES traffic(id)
            )
        ''')
        # FOREIGN KEY links each alert to its row in the traffic table
        # This lets us do: "show me the raw message that caused this alert"

        # Save the table creation to disk
        self.conn.commit()

    # ------------------------------------------------------------------
    #  LOG A TRAFFIC MESSAGE
    # ------------------------------------------------------------------
    def log_traffic(self, source_node: str, can_id: int, counter: int,
                    data_bytes: list, attack_type: str = None) -> int:
        """
        Insert one CAN message into the traffic table.

        Parameters
        ----------
        source_node : str   — 'NODE1' or 'NODE2'
        can_id      : int   — CAN ID as integer (e.g. 256)
        counter     : int   — message sequence number
        data_bytes  : list  — 8 integers (0-255)
        attack_type : str   — None if clean, else 'FLOOD'/'REPLAY'/'SPOOF'

        Returns
        -------
        int — the row ID of the inserted row (used to link to alerts table)
        """

        # Format timestamp as: 2025-06-01 14:32:05.123
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

        # Format CAN ID as hex string: 0x100
        can_id_str = f'0x{can_id:03X}'

        # Format data bytes as space-separated hex: '00 01 0B B8 DE AD BE EF'
        data_str = ' '.join(f'{b:02X}' for b in data_bytes)

        # is_alert is 1 if attack detected, 0 if clean
        is_alert = 1 if attack_type else 0

        # INSERT INTO traffic (...) VALUES (?, ?, ?, ?, ?, ?, ?)
        # The ? placeholders prevent SQL injection attacks
        # (even in a local demo, it's good practice)
        self.cursor.execute('''
            INSERT INTO traffic
                (timestamp, source_node, can_id, counter, data_bytes, attack_type, is_alert)
            VALUES
                (?, ?, ?, ?, ?, ?, ?)
        ''', (timestamp, source_node, can_id_str, counter, data_str, attack_type, is_alert))

        self.conn.commit()

        # lastrowid gives us the auto-assigned ID of the row we just inserted
        return self.cursor.lastrowid

    # ------------------------------------------------------------------
    #  LOG AN ALERT
    # ------------------------------------------------------------------
    def log_alert(self, attack_type: str, confidence: str, can_id: int,
                  details: str, traffic_id: int = None):
        """
        Insert one alert into the alerts table.

        Parameters
        ----------
        attack_type : str   — 'FLOOD', 'REPLAY', or 'SPOOF'
        confidence  : str   — 'LOW', 'MEDIUM', or 'HIGH'
        can_id      : int   — CAN ID that triggered the alert
        details     : str   — full explanation from the detector
        traffic_id  : int   — row ID from traffic table (optional link)
        """

        timestamp  = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        can_id_str = f'0x{can_id:03X}'

        self.cursor.execute('''
            INSERT INTO alerts
                (timestamp, attack_type, confidence, can_id, details, traffic_id)
            VALUES
                (?, ?, ?, ?, ?, ?)
        ''', (timestamp, attack_type, confidence, can_id_str, details, traffic_id))

        self.conn.commit()

    # ------------------------------------------------------------------
    #  QUERY HELPERS (used by the dashboard in Phase 4)
    # ------------------------------------------------------------------
    def get_recent_traffic(self, limit: int = 50) -> list:
        """
        Return the most recent `limit` traffic rows, newest first.
        Each row is a dict for easy use in the dashboard template.
        """
        self.cursor.execute('''
            SELECT id, timestamp, source_node, can_id, counter,
                   data_bytes, attack_type, is_alert
            FROM traffic
            ORDER BY id DESC
            LIMIT ?
        ''', (limit,))

        # fetchall() returns a list of tuples
        rows = self.cursor.fetchall()

        # Convert each tuple to a dict with named keys
        columns = ['id', 'timestamp', 'source_node', 'can_id', 'counter',
                   'data_bytes', 'attack_type', 'is_alert']
        return [dict(zip(columns, row)) for row in rows]

    def get_recent_alerts(self, limit: int = 20) -> list:
        """Return the most recent `limit` alerts, newest first."""
        self.cursor.execute('''
            SELECT id, timestamp, attack_type, confidence, can_id, details
            FROM alerts
            ORDER BY id DESC
            LIMIT ?
        ''', (limit,))

        rows = self.cursor.fetchall()
        columns = ['id', 'timestamp', 'attack_type', 'confidence', 'can_id', 'details']
        return [dict(zip(columns, row)) for row in rows]

    def get_stats(self) -> dict:
        """
        Return summary statistics for the dashboard header.
        Counts total messages, total alerts, and breakdown by attack type.
        """
        # Total messages logged
        self.cursor.execute('SELECT COUNT(*) FROM traffic')
        total_messages = self.cursor.fetchone()[0]

        # Total alerts raised
        self.cursor.execute('SELECT COUNT(*) FROM alerts')
        total_alerts = self.cursor.fetchone()[0]

        # Count by attack type
        self.cursor.execute('''
            SELECT attack_type, COUNT(*)
            FROM alerts
            GROUP BY attack_type
        ''')
        attack_counts = dict(self.cursor.fetchall())
        # attack_counts e.g. {'FLOOD': 3, 'REPLAY': 5, 'SPOOF': 2}

        return {
            'total_messages' : total_messages,
            'total_alerts'   : total_alerts,
            'flood_count'    : attack_counts.get('FLOOD',  0),
            'replay_count'   : attack_counts.get('REPLAY', 0),
            'spoof_count'    : attack_counts.get('SPOOF',  0),
        }

    # ------------------------------------------------------------------
    #  CLEANUP
    # ------------------------------------------------------------------
    def close(self):
        """Close the database connection cleanly."""
        if self.conn:
            self.conn.close()
            print("[LOGGER] Database connection closed.")

    def clear_all(self):
        """
        Delete all rows from both tables.
        Useful for starting a fresh demo without deleting the DB file.
        """
        self.cursor.execute('DELETE FROM traffic')
        self.cursor.execute('DELETE FROM alerts')
        self.conn.commit()
        print("[LOGGER] All logs cleared.")