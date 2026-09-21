import time

import cv2
import numpy as np
import torch

from src.anti_spoof import AntiSpoofPredict
from src.face_engine import FaceEngine


def main():
    print(f"torch: CUDA available = {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"torch: device = {torch.cuda.get_device_name(0)}")

    t0 = time.time()
    spoof = AntiSpoofPredict("models/anti_spoof")
    print(f"Loaded {len(spoof.models)} anti-spoofing models in {time.time() - t0:.2f}s "
          f"on {spoof.device}")

    engine = FaceEngine()
    n_enrolled = sum(len(v) for v in engine.known.values())
    print(f"Loaded face database: {len(engine.known)} people, {n_enrolled} samples")

    n = 20
    frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    bbox = [100, 100, 200, 200]
    label, score = spoof.predict(frame, bbox)
    t0 = time.time()
    for _ in range(n):
        spoof.predict(frame, bbox)
    print(f"Anti-spoof predict: {(time.time() - t0) / n * 1000:.1f} ms "
          f"(label={label}, score={score:.3f})")

    aligned = np.random.randint(0, 255, (112, 112, 3), dtype=np.uint8)
    feat = engine.recognizer.feature(aligned)
    t0 = time.time()
    for _ in range(n):
        engine.recognizer.feature(aligned)
    print(f"SFace feature:      {(time.time() - t0) / n * 1000:.1f} ms "
          f"(shape={feat.shape})")

    det_input = np.random.randint(0, 255, (360, 640, 3), dtype=np.uint8)
    engine.detect(det_input)
    t0 = time.time()
    for _ in range(n):
        engine.detect(det_input)
    print(f"YuNet detect:       {(time.time() - t0) / n * 1000:.1f} ms")

    print("OK: all models loaded and running.")


if __name__ == "__main__":
    main()
