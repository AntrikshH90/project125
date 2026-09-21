"""Download all model weights required by the face gate.

Run once before first use:
    python download_models.py
"""

import os
import urllib.request

FILES = {
    "models/face_detection_yunet_2023mar.onnx": [
        "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    ],
    "models/sface_2021dec.onnx": [
        "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
    ],
    "models/anti_spoof/2.7_80x80_MiniFASNetV2.pth": [
        "https://github.com/minivision-ai/Silent-Face-Anti-Spoofing/raw/master/resources/anti_spoof_models/2.7_80x80_MiniFASNetV2.pth",
    ],
    "models/anti_spoof/4_0_0_80x80_MiniFASNetV1SE.pth": [
        "https://github.com/minivision-ai/Silent-Face-Anti-Spoofing/raw/master/resources/anti_spoof_models/4_0_0_80x80_MiniFASNetV1SE.pth",
    ],
}


def download(path, urls):
    if os.path.exists(path):
        print(f"already present: {path}")
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    last_err = None
    for url in urls:
        try:
            print(f"downloading {os.path.basename(path)} ...")
            urllib.request.urlretrieve(url, path)
            print(f"saved {path} ({os.path.getsize(path)} bytes)")
            return
        except Exception as err:  # noqa: BLE001
            last_err = err
    raise RuntimeError(f"failed to download {path}: {last_err}")


if __name__ == "__main__":
    for target, sources in FILES.items():
        download(target, sources)
    print("all models ready")
