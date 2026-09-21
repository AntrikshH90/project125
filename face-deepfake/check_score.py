import cv2

from src.face_engine import FaceEngine

e = FaceEngine()
cam = cv2.VideoCapture(0)
cam.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
frame = None
for i in range(20):
    ok, frame = cam.read()
cam.release()
print("camera:", ok, frame.shape if ok else "")
faces = e.detect(frame)
face = e.largest_face(faces)
if face is None:
    print("no face detected in frame")
else:
    box = [int(v) for v in face[:4]]
    print("face box:", box)
    live, real, label = e.check_liveness(frame, box)
    verdict = "LIVE" if live else "REJECTED"
    print(f"real_prob={real:.3f} label={label} -> {verdict} (threshold {e.spoof_threshold})")
    cv2.imwrite("test_images/webcam_frame.jpg", frame)
