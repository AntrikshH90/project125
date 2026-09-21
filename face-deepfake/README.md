# AI Face Gate — Recognition + Anti-Spoofing (Deepfake/Photo Attack)

A contactless gate-access system that opens **only for a live, enrolled person**.
It blocks printed photos, phone screens, replayed videos and deepfake displays
using a dedicated liveness model, and recognizes authorized users in real time
(~45 ms/frame on an RTX 4050, real-time on CPU too).

## Pipeline

```
camera frame
   │
   ├─► 1. YuNet face detector            (ONNX, ~17 ms)
   │        face bbox + 5 landmarks
   │
   ├─► 2. MiniFASNet liveness ×2         (PyTorch, ~15 ms)
   │        class 0 = printed photo
   │        class 1 = REAL
   │        class 2 = screen / replay / deepfake display
   │        → real-face probability must pass threshold
   │
   └─► 3. SFace recognizer               (ONNX, ~12 ms)
            aligned 112×112 face → 128-D embedding
            cosine similarity vs enrolled database
            ≥ 0.637  → AUTHORIZED
```

Gate opens only when the face is **live AND recognized** for several
consecutive frames (temporal voting), with a cooldown between openings.
Every decision is logged to `database/access_log.csv`.

## Setup

```bash
pip install -r requirements.txt
python download_models.py        # fetches the 4 model weights (~40 MB)
```

GPU (optional, faster): install the CUDA build of PyTorch instead of the default:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu128
```

## Usage

```bash
# 1. Enroll a person (captures 5 live samples with 'c', rejects photos)
python enroll.py --name "Your Name"

# 2. Run the gate ('q' to quit)
python main.py
```

Diagnostics:

```bash
python test_setup.py             # loads all models, prints per-stage timing
python check_score.py            # one-shot liveness score from webcam
python test_recognize.py         # one-shot identity + gate decision
```

## Tuning

| Flag | Default | Meaning |
|---|---|---|
| `--spoof-threshold` | 0.50 | min real-face probability to accept as live |
| `--match-threshold` | 0.637 | SFace cosine similarity for a match |
| `--stable-frames` | 2 | consecutive live frames before a decision |
| `--cooldown` | 5.0 | seconds before the same person can re-open |

## Gate hardware

Replace `GateController.open()` in `src/gate_controller.py` with your backend,
e.g. a USB relay or Arduino over serial:

```python
import serial
serial.Serial("COM3", 9600).write(b"O")
```

## Model credits

- YuNet & SFace — [opencv/opencv_zoo](https://github.com/opencv/opencv_zoo)
- Silent-Face-Anti-Spoofing (MiniFASNet) —
  [minivision-ai/Silent-Face-Anti-Spoofing](https://github.com/minivision-ai/Silent-Face-Anti-Spoofing)

## Limitations

- Needs decent lighting; the face should be >100 px tall in frame.
- RGB webcam based — 3D silicone mask attacks would need extra sensors.
- Liveness threshold should be calibrated per camera (see scores live in `enroll.py`).
