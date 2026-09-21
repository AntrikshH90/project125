import argparse
import time

import cv2

from src.face_engine import FaceEngine


def main():
    ap = argparse.ArgumentParser(description="Enroll a person into the face database")
    ap.add_argument("--name", required=True)
    ap.add_argument("--samples", type=int, default=5)
    ap.add_argument("--camera", type=int, default=0)
    ap.add_argument("--spoof-threshold", type=float, default=0.30,
                    help="min real-face probability to accept a sample "
                         "(lower it if your real face keeps getting rejected)")
    args = ap.parse_args()

    engine = FaceEngine(spoof_threshold=args.spoof_threshold)
    cam = cv2.VideoCapture(args.camera)
    if not cam.isOpened():
        raise RuntimeError(f"Cannot open camera {args.camera}")

    print(f"Enrolling '{args.name}'. Look at the camera and press 'c' to capture "
          f"{args.samples} live samples. Press 'q' to quit.")
    captured = 0
    while True:
        ok, frame = cam.read()
        if not ok:
            break
        faces = engine.detect(frame)
        face = engine.largest_face(faces)
        disp = frame.copy()
        hint = f"{args.name}: {captured}/{args.samples}  (c=capture, q=quit)"
        color = (0, 255, 0)
        live_line = ""
        if face is None:
            hint = "NO FACE DETECTED - move closer"
            color = (0, 0, 255)
        else:
            x, y, w, h = [int(v) for v in face[:4]]
            cv2.rectangle(disp, (x, y), (x + w, y + h), color, 2)
            _, real_prob, label = engine.check_liveness(frame, [x, y, w, h])
            tag = "LIVE" if label == 1 else "FAKE?"
            live_line = f"real={real_prob:.2f}  model-says: {tag}  (need >={args.spoof_threshold:.2f})"
            live_color = (0, 255, 0) if real_prob >= args.spoof_threshold else (0, 200, 255)
            cv2.putText(disp, live_line, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        live_color, 2)
        cv2.putText(disp, hint, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        cv2.imshow("Enroll", disp)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        if key == ord("c"):
            if face is None:
                print("No face detected.")
                continue
            bbox = [int(v) for v in face[:4]]
            is_live, real_prob, _ = engine.check_liveness(frame, bbox)
            if not is_live:
                print(f"Sample rejected: real probability {real_prob:.2f} "
                      f"below threshold {args.spoof_threshold:.2f}. "
                      "Face the camera directly, improve lighting, or lower "
                      "--spoof-threshold.")
                continue
            engine.enroll(frame, face, args.name)
            captured += 1
            print(f"Captured sample {captured}/{args.samples} (real={real_prob:.2f})")
            if captured >= args.samples:
                print("Enrollment complete.")
                break
            time.sleep(0.4)

    cam.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
