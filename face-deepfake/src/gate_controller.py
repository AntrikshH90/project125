import csv
import datetime
import os
import time


class GateController:
    """Gate control with access logging.

    Replace open()/close() with your hardware backend:
    - USB relay board (pyserial): send a byte to open the relay channel
    - Arduino/ESP32: send 'O' over serial, gate firmware handles timing
    - Wiegand controller: wire a relay output to the gate push-button input
    """

    def __init__(self, open_seconds=3.0, log_path="database/access_log.csv"):
        self.open_seconds = open_seconds
        self.log_path = log_path
        self.open_until = 0.0
        self._ensure_log()

    def _ensure_log(self):
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)
        if not os.path.exists(self.log_path):
            with open(self.log_path, "w", newline="") as f:
                csv.writer(f).writerow(
                    ["timestamp", "name", "decision", "spoof_score", "match_distance"])

    def _log(self, name, decision, spoof_score, match_distance):
        with open(self.log_path, "a", newline="") as f:
            csv.writer(f).writerow([
                datetime.datetime.now().isoformat(timespec="seconds"),
                name, decision,
                f"{spoof_score:.2f}", f"{match_distance:.3f}"])

    def request(self, name, allowed, spoof_score=0.0, match_distance=0.0):
        decision = "GRANTED" if allowed else "DENIED"
        self._log(name, decision, spoof_score, match_distance)
        if allowed:
            self.open_until = time.time() + self.open_seconds
            self.open()
            print(f"[GATE] OPEN for {name} (auto-close in {self.open_seconds:.0f}s)")
        else:
            print(f"[GATE] DENIED {name}")

    def open(self):
        # TODO: replace with real hardware trigger, e.g.:
        # import serial; serial.Serial("COM3", 9600).write(b"O")
        pass

    @property
    def is_open(self):
        return time.time() < self.open_until
