"""
Voltix Home — Face Recognition Service (FastAPI + face_recognition / dlib)
Run: uvicorn main:app --host 0.0.0.0 --port 8000

Flow:
  ESP32-CAM POSTs JPEG to /api/vision/face
  → detect face(s), compute 128-d embedding
  → compare against AuthorizedPerson embeddings loaded from Postgres
  → persist snapshot + AccessLog decision via internal Next.js callback
"""
import io
import os
import time
import numpy as np
import face_recognition
import httpx
from fastapi import FastAPI, File, UploadFile, Header, HTTPException

# NOTE: set API_KEY values match ENVs on both services before boot.
API_KEY       = os.environ["VOLTIX_DEVICE_KEY"]
NEXT_BASE_URL = os.environ.get("NEXT_BASE_URL", "http://127.0.0.1:3000")
MATCH_TOLERANCE = 0.42          # dlib euclidean distance; lower = stricter
CONFIDENCE_FLOOR = 0.82

app = FastAPI(title="Voltix Vision Engine")

# Globals loaded at startup
KNOWN_ENCODINGS = np.empty((0, 128), dtype=np.float32)
KNOWN_IDS = []
KNOWN_NAMES = []

@app.on_event("startup")
def load_embeddings():
    """Pull known-face embeddings from the Next.js DB once at boot.
    Call POST /admin/reload-faces after enrolling a new person."""
    global KNOWN_ENCODINGS, KNOWN_IDS, KNOWN_NAMES
    resp = httpx.get(f"{NEXT_BASE_URL}/api/internal/persons",
                     headers={"X-Voltix-Key": API_KEY}).json()
    # persons: [{id, name, embedding: [128 floats]}]
    KNOWN_IDS    = [p["id"] for p in resp]
    KNOWN_NAMES  = [p["name"] for p in resp]
    KNOWN_ENCODINGS = np.array([p["embedding"] for p in resp], dtype=np.float32)
    print(f"Loaded {len(KNOWN_IDS)} authorized faces")

def confidence_from_distance(dist: float) -> float:
    """Map euclidean distance → human-readable confidence (0..1).
    dist 0 = perfect match, dist 1.0+ = total mismatch."""
    return max(0.0, min(1.0, 1.0 - dist))

@app.post("/api/vision/face")
async def recognize(file: UploadFile = File(...), x_voltix_key: str = Header("")):
    if x_voltix_key != API_KEY:
        raise HTTPException(401, "Bad device key")

    image_bytes = await file.read()

    # Faces may be skewed by the cheap OV2640 lens; upsampling helps detection
    # on far-away gate subjects at the cost of ~150ms CPU.
    img = face_recognition.load_image_file(io.BytesIO(image_bytes))
    locations = face_recognition.face_locations(img, number_of_times_to_upsample=1)
    if not locations:
        return {"decision": "DENIED_UNKNOWN", "confidence": 0.0,
                "snapshot": save_snapshot(image_bytes)}

    encodings = face_recognition.face_encodings(img, locations)
    best_dist, best_idx = 10.0, None

    for face_enc in encodings:
        if len(KNOWN_ENCODINGS) == 0:
            break
        dists = np.linalg.norm(KNOWN_ENCODINGS - face_enc.astype(np.float32), axis=1)
        i = int(np.argmin(dists))
        if dists[i] < best_dist:
            best_dist, best_idx = float(dists[i]), i

    conf = confidence_from_distance(best_dist)
    snapshot_path = save_snapshot(image_bytes)
    matched_id = KNOWN_IDS[best_idx] if best_idx is not None else None

    granted = matched_id is not None and best_dist < MATCH_TOLERANCE \
              and conf >= CONFIDENCE_FLOOR

    result = {
        "decision": "GRANTED" if granted else "DENIED_UNKNOWN",
        "personId": matched_id if granted else None,
        "personName": KNOWN_NAMES[best_idx] if granted else None,
        "confidence": round(conf, 3),
        "snapshot": snapshot_path,
    }

    # Notify the Next.js core → persists AccessLog + emits Socket.io + MQTT gate.
    try:
        async with httpx.AsyncClient() as client:
            await client.post(f"{NEXT_BASE_URL}/api/internal/face-result",
                              json=result,
                              headers={"X-Voltix-Key": API_KEY}, timeout=5)
    except Exception as e:
        print(f"WARN: could not reach Next core: {e}")  # never block gate actuation

    return result

def save_snapshot(data: bytes) -> str:
    ts = int(time.time())
    path = f"snapshots/{ts}-{abs(hash(data))}.jpg"
    with open(f"public/{path}", "wb") as f:
        f.write(data)
    return f"/{path}"


@app.post("/enroll")
async def enroll(file: UploadFile = File(...), x_voltix_key: str = Header("")):
    """Returns 128-d embedding for a single-face reference photo."""
    if x_voltix_key != API_KEY:
        raise HTTPException(401, "Bad device key")
    img = face_recognition.load_image_file(io.BytesIO(await file.read()))
    encs = face_recognition.face_encodings(img)
    if len(encs) != 1:
        raise HTTPException(422, f"Expected exactly 1 face, found {len(encs)}")
    return {"embedding": [float(x) for x in encs[0]]}


@app.post("/admin/reload-faces")
async def reload_faces(x_voltix_key: str = Header("")):
    """Hot-reload authorized person embeddings without restarting the service."""
    if x_voltix_key != API_KEY:
        raise HTTPException(401, "Bad device key")
    load_embeddings()
    return {"loaded": len(KNOWN_IDS), "status": "ok"}