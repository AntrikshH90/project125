import os
import pickle

import cv2
import numpy as np

from src.anti_spoof import AntiSpoofPredict


class FaceEngine:
    """Face detection (YuNet) + recognition (SFace) + liveness (MiniFASNet)."""

    def __init__(self, models_dir="models", db_path="database/embeddings.pkl",
                 spoof_threshold=0.55, match_threshold=0.637, device_id=0):
        # match_threshold is COSINE SIMILARITY: match() returns similarity
        # (same person ~0.8+, different person ~0). 0.637 == classic 0.363 distance.
        self.detector = cv2.FaceDetectorYN.create(
            os.path.join(models_dir, "face_detection_yunet_2023mar.onnx"),
            "", (320, 320), score_threshold=0.7, nms_threshold=0.3)
        self.recognizer = cv2.FaceRecognizerSF.create(
            os.path.join(models_dir, "sface_2021dec.onnx"), "")
        self.spoof = AntiSpoofPredict(os.path.join(models_dir, "anti_spoof"), device_id)
        self.spoof_threshold = spoof_threshold
        self.match_threshold = match_threshold
        self.db_path = db_path
        self.known = {}
        self._det_size = None
        self._load_db()

    def _load_db(self):
        if os.path.exists(self.db_path):
            with open(self.db_path, "rb") as f:
                self.known = pickle.load(f)
        else:
            self.known = {}

    def save_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with open(self.db_path, "wb") as f:
            pickle.dump(self.known, f)

    def detect(self, bgr):
        h, w = bgr.shape[:2]
        if (w, h) != self._det_size:
            self.detector.setInputSize((w, h))
            self._det_size = (w, h)
        _, faces = self.detector.detect(bgr)
        return faces

    @staticmethod
    def largest_face(faces):
        if faces is None or len(faces) == 0:
            return None
        return max(faces, key=lambda f: f[2] * f[3])

    def check_liveness(self, bgr, bbox):
        """Returns (is_live, real_probability, predicted_label)."""
        bbox = [int(v) for v in bbox]
        probs = self.spoof.predict_probs(bgr, bbox)
        label = int(np.argmax(probs))
        real_prob = float(probs[1])
        return label == 1 and real_prob >= self.spoof_threshold, real_prob, label

    def identify(self, bgr, face_row):
        aligned = self.recognizer.alignCrop(bgr, face_row.reshape(1, -1))
        feat = self.recognizer.feature(aligned)
        best_name, best_sim = "Unknown", -1.0
        for name, feats in self.known.items():
            for f in feats:
                sim = self.recognizer.match(feat, f.reshape(1, -1))
                if sim > best_sim:
                    best_sim, best_name = sim, name
        if best_sim >= self.match_threshold:
            return best_name, best_sim
        return "Unknown", best_sim

    def enroll(self, bgr, face_row, name):
        aligned = self.recognizer.alignCrop(bgr, face_row.reshape(1, -1))
        feat = self.recognizer.feature(aligned).flatten()
        self.known.setdefault(name, []).append(feat)
        self.save_db()
