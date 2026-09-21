import cv2

from src.face_engine import FaceEngine

e = FaceEngine()
cam = cv2.VideoCapture(0)
cam.set(3, 1280)
cam.set(4, 720)
frame = None
face = None
for attempt in range(5):
    for i in range(15):
        ok, frame = cam.read()
    face = e.largest_face(e.detect(frame))
    if face is not None:
        break
    print("no face yet, retrying...")
cam.release()
if face is None:
    print("NO FACE DETECTED - sit in front of the camera and rerun")
    raise SystemExit
name, sim = e.identify(frame, face)
live, real_prob, label = e.check_liveness(frame, [int(v) for v in face[:4]])
verdict = "AUTHORIZED" if name != "Unknown" else "UNKNOWN"
print(f"identity: {name} (similarity {sim:.3f}, threshold {e.match_threshold})")
print(f"liveness: real_prob={real_prob:.3f} -> {'LIVE' if live else 'FAKE'}")
print(f"GATE DECISION: {'OPEN' if live and name != 'Unknown' else 'DENIED'} ({verdict})")
