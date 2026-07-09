# ============================================================
#  main.py
#  Role : Entry point for the CAN Bus IDS.
#         Reads serial output from BOTH Arduino nodes,
#         parses CAN frames, and runs the full detection pipeline.
# ============================================================
#
#  HOW TO RUN:
#  -----------
#    pip install pyserial pycryptodome
#    python main.py
#
#  The program will:
#    1. Auto-detect which COM/serial port each Arduino is on
#       (or you can set them manually — see CONFIG section below)
#    2. Read lines from each Arduino's serial output
#    3. Parse each line into a structured CAN frame
#    4. Run detector.py → authenticator.py → alerter.py → logger.py
#    5. Print colored alerts to terminal when attacks are found
#    6. Save everything to logs/can_ids.db (SQLite)
#
#  RUNNING WITHOUT HARDWARE (simulation mode):
#  --------------------------------------------
#  If you don't have the Arduinos connected yet, set:
#      SIMULATION_MODE = True
#  The program will generate fake CAN frames to test the
#  detection logic. Useful for testing during development.
#
# ============================================================

import serial           # pip install pyserial — reads Arduino serial port
import serial.tools.list_ports   # helps list available COM ports
import threading        # runs Node1 and Node2 readers in parallel
import time
import sys
import os

# Import our own modules from the ids/ folder
from detector       import Detector
from authenticator  import Authenticator
from logger         import Logger
from alerter        import Alerter


# ============================================================
#  CONFIGURATION — edit these values to match your setup
# ============================================================

# Set to True to run without hardware (generates fake messages)
SIMULATION_MODE = True

# Serial port settings
# On Windows : 'COM3', 'COM4', etc.  (check Device Manager)
# On Linux   : '/dev/ttyUSB0', '/dev/ttyACM0', etc.
# On macOS   : '/dev/cu.usbmodem...'
# Set to None to AUTO-DETECT (the program will try to find Arduinos)
NODE1_PORT = None    # e.g. 'COM3'  or  '/dev/ttyACM0'
NODE2_PORT = None    # e.g. 'COM4'  or  '/dev/ttyACM1'

# Must match Serial.begin() in both Arduino sketches
BAUD_RATE = 115200

# How many seconds to wait for a serial port to respond
SERIAL_TIMEOUT = 2


# ============================================================
#  SERIAL LINE FORMATS (must match Arduino Serial.print output)
# ============================================================
#
#  Node 1 (legitimate) sends lines like:
#    NODE1|0|100|00 00 0B B8 DE AD BE EF|OK
#    ^     ^ ^   ^                       ^
#    node  | |   8 data bytes (hex)      send status
#          | CAN ID (hex)
#          counter
#
#  Node 2 (attacker) sends lines like:
#    NODE2|FLOOD|0|101|00 00 AA AA AA AA AA AA|OK
#    NODE2|REPLAY|CAPTURED|101|00 05 0B B8 DE AD BE EF|OK
#    NODE2|SPOOF|FAKE|100|00 01 0B B8 FF FF FF FF|OK
#
# ============================================================


def parse_node1_line(line: str) -> dict | None:
    """
    Parse a serial line from Node 1 (legitimate ECU).

    Input : 'NODE1|0|100|00 00 0B B8 DE AD BE EF|OK'
    Output: dict with keys: source, counter, can_id, data_bytes, status
    Returns None if the line doesn't match the expected format.
    """
    line = line.strip()

    # Quick check — must start with NODE1
    if not line.startswith('NODE1|'):
        return None

    parts = line.split('|')
    # Expected: ['NODE1', '0', '100', '00 00 0B B8 DE AD BE EF', 'OK']
    if len(parts) != 5:
        return None

    try:
        source   = 'NODE1'
        counter  = int(parts[1])                     # '0' → 0
        can_id   = int(parts[2], 16)                 # '100' → 256 (0x100)
        raw_data = parts[3].strip().split(' ')       # '00 00 ...' → ['00','00',...]
        data_bytes = [int(b, 16) for b in raw_data]  # hex strings → ints
        status   = parts[4]                           # 'OK' or 'FAIL'

        if len(data_bytes) != 8:
            return None   # must have exactly 8 bytes

        return {
            'source'     : source,
            'counter'    : counter,
            'can_id'     : can_id,
            'data_bytes' : data_bytes,
            'status'     : status,
        }

    except (ValueError, IndexError):
        # Parsing failed — ignore this line (might be a startup message)
        return None


def parse_node2_line(line: str) -> dict | None:
    """
    Parse a serial line from Node 2 (attacker).

    Handles three formats:
      FLOOD  → 'NODE2|FLOOD|0|101|00 00 AA AA AA AA AA AA|OK'
      REPLAY → 'NODE2|REPLAY|CAPTURED|101|00 05 ...|OK'
      SPOOF  → 'NODE2|SPOOF|FAKE|100|00 01 ...|OK'

    Output: dict with same keys as parse_node1_line, plus 'attack_mode'
    Returns None if the line doesn't match.
    """
    line = line.strip()

    if not line.startswith('NODE2|'):
        return None

    parts = line.split('|')

    # All Node 2 formats have at least 6 parts
    if len(parts) < 6:
        return None

    try:
        attack_mode = parts[1]   # 'FLOOD', 'REPLAY', or 'SPOOF'

        # All three formats have CAN ID at index 3, data at index 4
        # parts[2] is counter (FLOOD) or label ('CAPTURED'/'FAKE')
        can_id_str = parts[3]
        data_str   = parts[4]
        status     = parts[5]

        can_id     = int(can_id_str, 16)
        raw_data   = data_str.strip().split(' ')
        data_bytes = [int(b, 16) for b in raw_data]

        # Counter: for FLOOD it's a number; for REPLAY/SPOOF it's a label
        try:
            counter = int(parts[2])
        except ValueError:
            counter = 0    # 'CAPTURED' or 'FAKE' → treat as counter=0

        if len(data_bytes) != 8:
            return None

        return {
            'source'      : 'NODE2',
            'attack_mode' : attack_mode,
            'counter'     : counter,
            'can_id'      : can_id,
            'data_bytes'  : data_bytes,
            'status'      : status,
        }

    except (ValueError, IndexError):
        return None


# ============================================================
#  DETECTION PIPELINE
#  Called once for every parsed CAN frame
# ============================================================

def process_frame(frame: dict, detector: Detector,
                  logger: Logger, alerter: Alerter):
    """
    Run one CAN frame through the full IDS pipeline:
      1. Detector checks for FLOOD / REPLAY / SPOOF
      2. Logger saves the frame to SQLite
      3. Alerter displays & logs any attack

    Parameters
    ----------
    frame    : dict — output from parse_node1_line or parse_node2_line
    detector : Detector — shared detection engine (has state)
    logger   : Logger   — shared database logger
    alerter  : Alerter  — shared alert handler
    """
    source     = frame['source']
    can_id     = frame['can_id']
    counter    = frame['counter']
    data_bytes = frame['data_bytes']

    # --- STEP 1: RUN DETECTION ---
    result = detector.check_message(
        can_id      = can_id,
        counter     = counter,
        data_bytes  = data_bytes,
        source_node = source
    )

    # --- STEP 2: LOG TO DATABASE ---
    attack_type = result.attack_type if result.attack_detected else None

    traffic_id = logger.log_traffic(
        source_node = source,
        can_id      = can_id,
        counter     = counter,
        data_bytes  = data_bytes,
        attack_type = attack_type
    )

    # --- STEP 3: ALERT OR CLEAN ---
    if result.attack_detected:
        # Alert: display on terminal + write to alerts.log + write to DB
        alerter.raise_alert(
            attack_type = result.attack_type,
            confidence  = result.confidence,
            can_id      = can_id,
            details     = result.details
        )
        logger.log_alert(
            attack_type = result.attack_type,
            confidence  = result.confidence,
            can_id      = can_id,
            details     = result.details,
            traffic_id  = traffic_id
        )
    else:
        # Clean message — optional terminal output
        alerter.log_clean(can_id=can_id, counter=counter, source_node=source)


# ============================================================
#  SERIAL READER THREAD
#  One thread per Arduino node
# ============================================================

def serial_reader_thread(port: str, node_name: str,
                         detector: Detector, logger: Logger, alerter: Alerter,
                         stop_event: threading.Event):
    """
    Continuously reads lines from one Arduino's serial port.
    Runs in its own thread so Node1 and Node2 are read in parallel.

    Parameters
    ----------
    port        : str            — e.g. 'COM3' or '/dev/ttyACM0'
    node_name   : str            — 'NODE1' or 'NODE2'
    stop_event  : threading.Event — set this to True to stop the thread
    """
    parse_fn = parse_node1_line if node_name == 'NODE1' else parse_node2_line

    try:
        ser = serial.Serial(port, BAUD_RATE, timeout=SERIAL_TIMEOUT)
        print(f"  [SERIAL] {node_name} connected on {port} @ {BAUD_RATE} baud")

        while not stop_event.is_set():
            try:
                # readline() blocks until a '\n' is received or timeout
                raw = ser.readline()

                # Decode bytes to string; ignore garbled characters
                line = raw.decode('utf-8', errors='ignore').strip()

                if not line:
                    continue   # empty line — skip it

                # Parse the line into a structured frame
                frame = parse_fn(line)

                if frame:
                    process_frame(frame, detector, logger, alerter)
                else:
                    # Not a data line (e.g. startup message) — print as info
                    print(f"  [{node_name}] {line}")

            except serial.SerialException as e:
                print(f"  [ERROR] {node_name} serial error: {e}")
                time.sleep(1)   # wait before retrying
                break

        ser.close()
        print(f"  [SERIAL] {node_name} port closed.")

    except serial.SerialException as e:
        print(f"  [ERROR] Could not open {node_name} on {port}: {e}")
        print(f"          Check the port name and that the Arduino is plugged in.")


# ============================================================
#  AUTO-DETECT ARDUINO PORTS
# ============================================================

def find_arduino_ports() -> list:
    """
    Scan all available serial ports and return ones that look like Arduinos.
    Works by checking the port description for keywords like 'Arduino' or 'CH340'.

    Most Arduino Uno clones (from Indian sellers) use CH340 USB chips.
    Genuine Arduino Uno uses ATmega16U2 which shows as 'Arduino Uno'.
    """
    arduino_ports = []
    all_ports = serial.tools.list_ports.comports()

    for port in all_ports:
        description = (port.description or '').lower()
        manufacturer = (port.manufacturer or '').lower()

        if any(keyword in description or keyword in manufacturer
               for keyword in ['arduino', 'ch340', 'ch341', 'ftdi', 'usb serial']):
            arduino_ports.append(port.device)
            print(f"  [DETECT] Found Arduino-like device: {port.device} — {port.description}")

    return arduino_ports


# ============================================================
#  SIMULATION MODE
#  Generates fake CAN frames to test detection without hardware
# ============================================================

def run_simulation(detector: Detector, logger: Logger, alerter: Alerter):
    """
    Simulate CAN traffic for testing when hardware isn't available.

    Sequence:
      1. 10 clean Node1 heartbeats (should all be CLEAN)
      2. 50 rapid flood messages   (should trigger FLOOD alert)
      3. 5 replay messages         (same counter → REPLAY alert)
      4. 3 spoof messages          (wrong token → SPOOF alert)
      5. 5 clean messages again    (should be CLEAN)
    """
    import random

    print("\n  [SIM] Running in SIMULATION MODE — no hardware needed")
    print("  [SIM] Generating test CAN frames...\n")
    time.sleep(1)

    # --- Phase 1: Clean heartbeats ---
    print("  [SIM] === Phase 1: Normal heartbeats ===")
    for i in range(10):
        frame = {
            'source'     : 'NODE1',
            'can_id'     : 0x100,
            'counter'    : i,
            'data_bytes' : [0x00, i, 0x0B, 0xB8, 0xDE, 0xAD, 0xBE, 0xEF],
            'status'     : 'OK'
        }
        process_frame(frame, detector, logger, alerter)
        time.sleep(0.3)

    time.sleep(0.5)

    # --- Phase 2: Flood attack ---
    print("\n  [SIM] === Phase 2: FLOOD attack ===")
    for i in range(50):
        frame = {
            'source'     : 'NODE2',
            'can_id'     : 0x101,
            'counter'    : i,
            'data_bytes' : [0x00, i % 256, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA],
            'status'     : 'OK'
        }
        process_frame(frame, detector, logger, alerter)
        # No sleep = flood

    time.sleep(0.5)

    # --- Phase 3: Replay attack ---
    print("\n  [SIM] === Phase 3: REPLAY attack ===")
    for _ in range(5):
        frame = {
            'source'     : 'NODE2',
            'can_id'     : 0x101,
            'counter'    : 5,          # counter never changes → replay
            'data_bytes' : [0x00, 0x05, 0x0B, 0xB8, 0xDE, 0xAD, 0xBE, 0xEF],
            'status'     : 'OK'
        }
        process_frame(frame, detector, logger, alerter)
        time.sleep(0.5)

    time.sleep(0.5)

    # --- Phase 4: Spoof attack ---
    print("\n  [SIM] === Phase 4: SPOOF attack ===")
    for i in range(3):
        frame = {
            'source'     : 'NODE2',
            'can_id'     : 0x100,      # pretending to be Node1
            'counter'    : i,
            'data_bytes' : [0x00, i, 0x0B, 0xB8, 0xFF, 0xFF, 0xFF, 0xFF],  # wrong token
            'status'     : 'OK'
        }
        process_frame(frame, detector, logger, alerter)
        time.sleep(0.6)

    time.sleep(0.5)

    # --- Phase 5: Back to clean ---
    print("\n  [SIM] === Phase 5: Back to normal ===")
    for i in range(5):
        frame = {
            'source'     : 'NODE1',
            'can_id'     : 0x100,
            'counter'    : 20 + i,
            'data_bytes' : [0x00, 20 + i, 0x0B, 0xB8, 0xDE, 0xAD, 0xBE, 0xEF],
            'status'     : 'OK'
        }
        process_frame(frame, detector, logger, alerter)
        time.sleep(0.3)

    print("\n  [SIM] Simulation complete.")


# ============================================================
#  MAIN — program entry point
# ============================================================

def main():
    print()
    print("  Starting CAN Bus IDS...")
    print()

    # --- INITIALIZE ALL MODULES ---
    detector = Detector()    # detection engine (stateful)
    logger   = Logger()      # SQLite database
    alerter  = Alerter(verbose_clean=False)
    # Set verbose_clean=True if you want to see every clean message printed

    # --- SIMULATION MODE ---
    if SIMULATION_MODE:
        try:
            run_simulation(detector, logger, alerter)
        except KeyboardInterrupt:
            pass
        finally:
            alerter.print_summary()
            logger.close()
        return

    # --- HARDWARE MODE: find or use configured serial ports ---
    print("  Detecting Arduino serial ports...")

    node1_port = NODE1_PORT
    node2_port = NODE2_PORT

    if node1_port is None or node2_port is None:
        # Auto-detect
        found_ports = find_arduino_ports()

        if len(found_ports) < 2:
            print()
            print("  [ERROR] Could not find 2 Arduino devices.")
            print("  Make sure both Arduinos are plugged in via USB.")
            print()
            print("  Available serial ports on your system:")
            for p in serial.tools.list_ports.comports():
                print(f"    {p.device}  —  {p.description}")
            print()
            print("  Set NODE1_PORT and NODE2_PORT manually at the top of main.py")
            sys.exit(1)

        # Assign in detection order
        # Node 1 (legitimate) gets the first found port
        # Node 2 (attacker)   gets the second found port
        if node1_port is None:
            node1_port = found_ports[0]
        if node2_port is None:
            node2_port = found_ports[1] if len(found_ports) > 1 else found_ports[0]

    print(f"  NODE1 port: {node1_port}")
    print(f"  NODE2 port: {node2_port}")
    print()
    print("  IDS is running. Press Ctrl+C to stop.")
    print()

    # --- START SERIAL READER THREADS ---
    # threading.Event is a simple flag we can set to stop threads
    stop_event = threading.Event()

    # Create one thread per Arduino
    thread1 = threading.Thread(
        target = serial_reader_thread,
        args   = (node1_port, 'NODE1', detector, logger, alerter, stop_event),
        daemon = True    # daemon=True means thread stops when main program exits
    )
    thread2 = threading.Thread(
        target = serial_reader_thread,
        args   = (node2_port, 'NODE2', detector, logger, alerter, stop_event),
        daemon = True
    )

    thread1.start()
    thread2.start()

    # --- KEEP MAIN THREAD ALIVE ---
    # The main thread just waits here for Ctrl+C.
    # All the real work happens in thread1 and thread2.
    try:
        while True:
            time.sleep(0.1)

    except KeyboardInterrupt:
        # User pressed Ctrl+C — clean shutdown
        print()
        print("  Shutting down IDS...")
        stop_event.set()    # signal both threads to stop

        thread1.join(timeout=3)
        thread2.join(timeout=3)

        alerter.print_summary()
        logger.close()
        print("  Goodbye.")


# ============================================================
#  PYTHON ENTRY POINT
#  This block only runs when you do: python main.py
#  It does NOT run when another file imports main.py
# ============================================================
if __name__ == '__main__':
    main()