import argparse
import time

import cv2

from src.face_engine import FaceEngine
from src.gate_controller import GateController


def run(args):
    engine = FaceEngine(
        spoof_threshold=args.spoof_threshold,
        match_threshold=args.match_threshold)
    gate = GateController(open_seconds=args.gate_seconds)

    if not engine.known:
        print("WARNING: no enrolled faces yet. Run:  python enroll.py --name \"YourName\"")

    cam = cv2.VideoCapture(args.camera)
    cam.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    if not cam.isOpened():
        raise RuntimeError(f"Cannot open camera {args.camera}")

    live_hits, fake_hits = 0, 0
    last_grant, last_deny = 0.0, 0.0
    fps_t, fps_n, fps_val = time.time(), 0, 0.0
    status, status_color = "SHOW YOUR FACE", (200, 200, 200)

    print("Running. Keys: q=quit")

    while True:
        ok, frame = cam.read()
        if not ok:
            break

        if frame.shape[1] > args.process_width:
            scale = args.process_width / frame.shape[1]
            frame = cv2.resize(frame, (args.process_width, int(frame.shape[0] * scale)))

        faces = engine.detect(frame)
        face = engine.largest_face(faces)
        box_color = (0, 255, 0)

        if face is None:
            live_hits, fake_hits = 0, 0
            status, status_color = "SHOW YOUR FACE", (200, 200, 200)
        else:
            x, y, w, h = [int(v) for v in face[:4]]
            is_live, spoof_score, _ = engine.check_liveness(frame, [x, y, w, h])

            if is_live:
                live_hits += 1
                fake_hits = 0
                name, dist = engine.identify(frame, face)
                authorized = name != "Unknown"
                status = f"HELLO {name}  (match {dist:.2f})"
                status_color = (0, 255, 0) if authorized else (0, 200, 255)
                if authorized and live_hits >= args.stable_frames \
                        and time.time() - last_grant > args.cooldown:
                    gate.request(name, True, spoof_score, dist)
                    last_grant = time.time()
                    status, status_color = f"ACCESS GRANTED: {name}", (0, 255, 0)
                elif not authorized and live_hits >= args.stable_frames \
                        and time.time() - last_deny > 2.0:
                    gate.request("Unknown", False, spoof_score, dist)
                    last_deny = time.time()
                    status, status_color = "ACCESS DENIED: not enrolled", (0, 0, 255)
                box_color = (0, 255, 0) if authorized else (0, 200, 255)
            else:
                fake_hits += 1
                live_hits = 0
                status, status_color = f"SPOOF DETECTED (score {spoof_score:.2f})", (0, 0, 255)
                box_color = (0, 0, 255)
                if fake_hits >= args.stable_frames and time.time() - last_deny > 2.0:
                    gate.request("SpoofAttempt", False, spoof_score, 0.0)
                    last_deny = time.time()

            cv2.rectangle(frame, (x, y), (x + w, y + h), box_color, 2)

        fps_n += 1
        if time.time() - fps_t >= 1.0:
            fps_val, fps_t, fps_n = fps_n, time.time(), 0

        cv2.putText(frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8,
                    status_color, 2)
        gate_label = "GATE OPEN" if gate.is_open else "GATE CLOSED"
        cv2.putText(frame, gate_label, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                    (0, 255, 0) if gate.is_open else (128, 128, 128), 2)
        cv2.putText(frame, f"FPS: {fps_val:.0f}", (10, 90), cv2.FONT_HERSHEY_SIMPLEX,
                    0.7, (255, 255, 255), 2)
        cv2.imshow("Face Gate", frame)

        if (cv2.waitKey(1) & 0xFF) == ord("q"):
            break

    cam.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Face recognition gate with anti-spoofing")
    ap.add_argument("--camera", type=int, default=0)
    ap.add_argument("--process-width", type=int, default=640,
                    help="frames are downscaled to this width for speed")
    ap.add_argument("--spoof-threshold", type=float, default=0.50,
                    help="min real-face probability to accept as live (0..1)")
    ap.add_argument("--match-threshold", type=float, default=0.637,
                    help="SFace cosine similarity threshold (higher = stricter)")
    ap.add_argument("--stable-frames", type=int, default=2,
                    help="consecutive live frames needed before a decision")
    ap.add_argument("--gate-seconds", type=float, default=3.0)
    ap.add_argument("--cooldown", type=float, default=5.0,
                    help="seconds before the same person can re-open the gate")
    run(ap.parse_args())
