# ============================================================
#  alerter.py
#  Role : Displays alerts on the terminal with color coding
#         and writes them to a human-readable alerts.log file
# ============================================================
#
#  WHAT THIS FILE DOES (plain English):
#  -------------------------------------
#  When the detector finds an attack, it tells the alerter.
#  The alerter then does TWO things:
#
#    1. PRINTS a colored alert to the terminal window
#       so you can see attacks happening in real time.
#       Red = FLOOD, Yellow = REPLAY, Magenta = SPOOF
#
#    2. WRITES the alert to alerts.log — a plain text file
#       you can open and read anytime, or show to your mentor.
#
#  WHAT ARE ANSI COLOR CODES?
#  ---------------------------
#  Terminals understand special escape sequences to change text color.
#  For example: '\033[91m' means "switch to bright red".
#               '\033[0m'  means "reset to default color".
#  These codes work on Linux, macOS, and Windows 10+ terminals.
#  If you see weird characters instead of colors, run in a proper
#  terminal (not Windows cmd.exe — use PowerShell or Windows Terminal).
#
# ============================================================

import os
import datetime


# Path to the plain-text alert log file
LOG_PATH = os.path.join(os.path.dirname(__file__), '..', 'logs', 'alerts.log')


# ============================================================
#  ANSI COLOR CODES
#  These are terminal escape sequences for colored text output.
# ============================================================
class Colors:
    RESET   = '\033[0m'     # Back to normal color
    BOLD    = '\033[1m'     # Bold text

    RED     = '\033[91m'    # Bright red    → FLOOD alerts
    YELLOW  = '\033[93m'    # Bright yellow → REPLAY alerts
    MAGENTA = '\033[95m'    # Bright magenta → SPOOF alerts
    GREEN   = '\033[92m'    # Bright green  → Clean messages
    CYAN    = '\033[96m'    # Cyan          → Info / startup messages
    WHITE   = '\033[97m'    # White         → General text


# Map each attack type to a color
ATTACK_COLORS = {
    'FLOOD'  : Colors.RED,
    'REPLAY' : Colors.YELLOW,
    'SPOOF'  : Colors.MAGENTA,
}

# Map each attack type to an emoji for visual punch in the terminal
ATTACK_ICONS = {
    'FLOOD'  : '🌊',
    'REPLAY' : '🔁',
    'SPOOF'  : '🎭',
}


class Alerter:
    """
    Handles alert display and logging.

    Usage:
        alerter = Alerter()
        alerter.raise_alert(attack_type='FLOOD', confidence='HIGH',
                            can_id=0x101, details='50 msgs in 1s')
        alerter.log_clean(can_id=0x100, counter=5)
    """

    def __init__(self, log_path: str = LOG_PATH, verbose_clean: bool = False):
        """
        Parameters
        ----------
        log_path      : str  — path to the .log text file
        verbose_clean : bool — if True, print EVERY clean message to terminal.
                               If False (default), only print alerts.
                               Turn this on for debugging, off for normal use
                               (otherwise your terminal fills up instantly).
        """
        # Make sure logs/ directory exists
        os.makedirs(os.path.dirname(os.path.abspath(log_path)), exist_ok=True)

        self.log_path     = log_path
        self.verbose_clean = verbose_clean

        # Counters — useful for the summary at the end
        self.total_messages = 0
        self.total_alerts   = 0
        self.alert_counts   = {'FLOOD': 0, 'REPLAY': 0, 'SPOOF': 0}

        # Print startup banner
        self._print_banner()

    # ------------------------------------------------------------------
    #  RAISE AN ATTACK ALERT
    # ------------------------------------------------------------------
    def raise_alert(self, attack_type: str, confidence: str,
                    can_id: int, details: str):
        """
        Display and log an attack alert.

        Parameters
        ----------
        attack_type : str — 'FLOOD', 'REPLAY', or 'SPOOF'
        confidence  : str — 'LOW', 'MEDIUM', or 'HIGH'
        can_id      : int — the CAN ID that triggered the alert
        details     : str — explanation from the detector
        """
        self.total_alerts += 1
        self.alert_counts[attack_type] = self.alert_counts.get(attack_type, 0) + 1

        timestamp  = self._now()
        color      = ATTACK_COLORS.get(attack_type, Colors.WHITE)
        icon       = ATTACK_ICONS.get(attack_type, '⚠️')
        can_id_str = f'0x{can_id:03X}'

        # --- TERMINAL OUTPUT ---
        # Build the alert line with colors
        border = color + '━' * 60 + Colors.RESET
        print(border)
        print(
            f"{color}{Colors.BOLD}  {icon}  ATTACK DETECTED — {attack_type}{Colors.RESET}"
        )
        print(f"  {Colors.WHITE}Time       :{Colors.RESET} {timestamp}")
        print(f"  {Colors.WHITE}CAN ID     :{Colors.RESET} {can_id_str}")
        print(f"  {Colors.WHITE}Confidence :{Colors.RESET} {self._confidence_colored(confidence)}")
        print(f"  {Colors.WHITE}Details    :{Colors.RESET} {details}")
        print(border)
        print()  # blank line for readability

        # --- FILE OUTPUT ---
        self._write_to_log(
            f"[ALERT] [{timestamp}] {attack_type} | {confidence} confidence | "
            f"CAN_ID={can_id_str} | {details}"
        )

    # ------------------------------------------------------------------
    #  LOG A CLEAN MESSAGE (optional terminal output)
    # ------------------------------------------------------------------
    def log_clean(self, can_id: int, counter: int, source_node: str = '?'):
        """
        Called for every message that passes all detection checks.

        If verbose_clean=True, prints a short clean message line.
        Always increments the total_messages counter.
        """
        self.total_messages += 1

        if self.verbose_clean:
            can_id_str = f'0x{can_id:03X}'
            print(
                f"  {Colors.GREEN}✓ CLEAN{Colors.RESET}  "
                f"[{source_node}] CAN_ID={can_id_str}  counter={counter}"
            )

    # ------------------------------------------------------------------
    #  PRINT IDS STARTUP BANNER
    # ------------------------------------------------------------------
    def _print_banner(self):
        """Prints a startup banner so you know the IDS is running."""
        print()
        print(Colors.CYAN + Colors.BOLD + '╔' + '═' * 58 + '╗' + Colors.RESET)
        print(Colors.CYAN + Colors.BOLD + '║     CAN Bus Intrusion Detection System  v1.0        ║' + Colors.RESET)
        print(Colors.CYAN + Colors.BOLD + '║     Automotive Cybersecurity — SRM IST Internship   ║' + Colors.RESET)
        print(Colors.CYAN + Colors.BOLD + '╚' + '═' * 58 + '╝' + Colors.RESET)
        print()
        print(f"  {Colors.CYAN}Detecting:{Colors.RESET} FLOOD attacks  |  REPLAY attacks  |  SPOOF attacks")
        print(f"  {Colors.CYAN}Alert log:{Colors.RESET} {os.path.abspath(self.log_path)}")
        print()
        self._write_to_log("=" * 60)
        self._write_to_log("CAN Bus IDS started at " + self._now())
        self._write_to_log("=" * 60)

    # ------------------------------------------------------------------
    #  PRINT SESSION SUMMARY (call when IDS shuts down)
    # ------------------------------------------------------------------
    def print_summary(self):
        """Prints a summary when the IDS exits (Ctrl+C)."""
        print()
        print(Colors.CYAN + Colors.BOLD + '─' * 60 + Colors.RESET)
        print(Colors.CYAN + Colors.BOLD + '  SESSION SUMMARY' + Colors.RESET)
        print(Colors.CYAN + '─' * 60 + Colors.RESET)
        print(f"  Total messages processed : {self.total_messages}")
        print(f"  Total alerts raised      : {self.total_alerts}")
        print(f"  {Colors.RED}  Flood alerts   : {self.alert_counts.get('FLOOD',  0)}{Colors.RESET}")
        print(f"  {Colors.YELLOW}  Replay alerts  : {self.alert_counts.get('REPLAY', 0)}{Colors.RESET}")
        print(f"  {Colors.MAGENTA}  Spoof alerts   : {self.alert_counts.get('SPOOF',  0)}{Colors.RESET}")
        print(Colors.CYAN + '─' * 60 + Colors.RESET)

        summary_line = (
            f"Session ended {self._now()} | "
            f"Messages={self.total_messages} | Alerts={self.total_alerts} | "
            f"Flood={self.alert_counts.get('FLOOD',0)} | "
            f"Replay={self.alert_counts.get('REPLAY',0)} | "
            f"Spoof={self.alert_counts.get('SPOOF',0)}"
        )
        self._write_to_log(summary_line)
        self._write_to_log("=" * 60)

    # ------------------------------------------------------------------
    #  HELPERS
    # ------------------------------------------------------------------
    def _now(self) -> str:
        """Return current timestamp as a clean string."""
        return datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    def _write_to_log(self, line: str):
        """
        Append one line to the alerts.log text file.
        'a' mode = append (don't overwrite existing content).
        """
        with open(self.log_path, 'a', encoding='utf-8') as f:
            f.write(line + '\n')

    def _confidence_colored(self, confidence: str) -> str:
        """Return confidence string with appropriate color."""
        color_map = {
            'HIGH'   : Colors.RED,
            'MEDIUM' : Colors.YELLOW,
            'LOW'    : Colors.WHITE,
        }
        color = color_map.get(confidence, Colors.WHITE)
        return f"{color}{Colors.BOLD}{confidence}{Colors.RESET}"