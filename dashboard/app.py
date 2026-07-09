import os
import sqlite3
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'logs', 'can_ids.db')
DB_ABS  = os.path.abspath(DB_PATH)

print("DATABASE:", DB_ABS)


# ── helpers ────────────────────────────────────────────────

def db_exists():
    return os.path.exists(DB_ABS)


def get_db():
    conn = sqlite3.connect(DB_ABS)
    conn.row_factory = sqlite3.Row
    return conn


def db_missing_response():
    return jsonify({'error': 'Database not found'}), 500


def fetch_stats(cursor):
    cursor.execute('SELECT COUNT(*) FROM traffic')
    total_messages = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM alerts')
    total_alerts = cursor.fetchone()[0]

    cursor.execute('''
        SELECT attack_type, COUNT(*) AS count
        FROM alerts
        GROUP BY attack_type
    ''')
    attack_counts = {row[0]: row[1] for row in cursor.fetchall()}

    if total_messages > 0:
        alert_rate = round((total_alerts / total_messages) * 100, 2)
    else:
        alert_rate = 0.0

    return {
        'total_messages': total_messages,
        'total_alerts':   total_alerts,
        'flood_count':    attack_counts.get('FLOOD',  0),
        'replay_count':   attack_counts.get('REPLAY', 0),
        'spoof_count':    attack_counts.get('SPOOF',  0),
        'alert_rate':     alert_rate,
    }


def fetch_alerts(cursor, limit=100):
    cursor.execute('''
        SELECT id, timestamp, attack_type, confidence, can_id, details, traffic_id
        FROM alerts
        ORDER BY id DESC
        LIMIT ?
    ''', (limit,))
    return [dict(row) for row in cursor.fetchall()]


def fetch_traffic(cursor, limit=100):
    cursor.execute('''
        SELECT id, timestamp, source_node, can_id, counter,
               data_bytes, attack_type, is_alert
        FROM traffic
        ORDER BY id DESC
        LIMIT ?
    ''', (limit,))
    return [dict(row) for row in cursor.fetchall()]


# ── /api/alerts ────────────────────────────────────────────

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    if not db_exists():
        return db_missing_response()
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM alerts')
        total_alerts = cursor.fetchone()[0]
        alerts = fetch_alerts(cursor, limit=100)
        return jsonify({
            'total_alerts': total_alerts,
            'alerts':       alerts,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ── /api/traffic ───────────────────────────────────────────

@app.route('/api/traffic', methods=['GET'])
def get_traffic():
    if not db_exists():
        return db_missing_response()
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM traffic')
        total_records = cursor.fetchone()[0]
        traffic = fetch_traffic(cursor, limit=100)
        return jsonify({
            'total_records': total_records,
            'traffic':       traffic,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ── /api/stats ─────────────────────────────────────────────

@app.route('/api/stats', methods=['GET'])
def get_stats():
    if not db_exists():
        return db_missing_response()
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        return jsonify(fetch_stats(cursor))
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ── /api/dashboard ─────────────────────────────────────────

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    if not db_exists():
        return db_missing_response()
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        stats           = fetch_stats(cursor)
        recent_alerts   = fetch_alerts(cursor,  limit=10)
        recent_traffic  = fetch_traffic(cursor, limit=20)
        return jsonify({
            'stats':          stats,
            'recent_alerts':  recent_alerts,
            'recent_traffic': recent_traffic,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            conn.close()


# ── /api/health ────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status':    'ok',
        'db_path':   DB_ABS,
        'db_exists': db_exists(),
    })


# ── entry point ────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)