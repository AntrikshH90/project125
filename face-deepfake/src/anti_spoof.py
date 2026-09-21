import os

import cv2
import numpy as np
import torch
import torch.nn.functional as F

from src.model_lib.MiniFASNet import (
    MiniFASNetV1,
    MiniFASNetV1SE,
    MiniFASNetV2,
    MiniFASNetV2SE,
)

MODEL_MAPPING = {
    "MiniFASNetV1": MiniFASNetV1,
    "MiniFASNetV2": MiniFASNetV2,
    "MiniFASNetV1SE": MiniFASNetV1SE,
    "MiniFASNetV2SE": MiniFASNetV2SE,
}


def parse_model_name(model_name):
    info = model_name.split("_")[0:-1]
    h_input, w_input = info[-1].split("x")
    model_type = model_name.split(".pth")[0].split("_")[-1]
    scale = None if info[0] == "org" else float(info[0])
    return int(h_input), int(w_input), model_type, scale


def get_kernel(height, width):
    return ((height + 15) // 16, (width + 15) // 16)


class CropImage:
    @staticmethod
    def _get_new_box(src_w, src_h, bbox, scale):
        x, y, box_w, box_h = bbox

        scale = min((src_h - 1) / box_h, min((src_w - 1) / box_w, scale))

        new_width = box_w * scale
        new_height = box_h * scale
        center_x, center_y = box_w / 2 + x, box_h / 2 + y

        left_top_x = center_x - new_width / 2
        left_top_y = center_y - new_height / 2
        right_bottom_x = center_x + new_width / 2
        right_bottom_y = center_y + new_height / 2

        if left_top_x < 0:
            right_bottom_x -= left_top_x
            left_top_x = 0

        if left_top_y < 0:
            right_bottom_y -= left_top_y
            left_top_y = 0

        if right_bottom_x > src_w - 1:
            left_top_x -= right_bottom_x - src_w + 1
            right_bottom_x = src_w - 1

        if right_bottom_y > src_h - 1:
            left_top_y -= right_bottom_y - src_h + 1
            right_bottom_y = src_h - 1

        return int(left_top_x), int(left_top_y), int(right_bottom_x), int(right_bottom_y)

    @staticmethod
    def crop(org_img, bbox, scale, out_w, out_h, crop=True):
        if not crop:
            dst_img = cv2.resize(org_img, (out_w, out_h))
        else:
            src_h, src_w = org_img.shape[:2]
            left_top_x, left_top_y, right_bottom_x, right_bottom_y = CropImage._get_new_box(
                src_w, src_h, bbox, scale)
            img = org_img[left_top_y: right_bottom_y + 1,
                          left_top_x: right_bottom_x + 1]
            dst_img = cv2.resize(img, (out_w, out_h))
        return dst_img


class AntiSpoofPredict:
    """Silent-Face-Anti-Spoofing ensemble (MiniFASNet).

    Models are loaded once at startup. Label 1 = real face,
    labels 0/2 = fake (printed photo / screen replay).
    """

    def __init__(self, model_dir, device_id=0):
        if torch.cuda.is_available():
            self.device = torch.device(f"cuda:{device_id}")
        else:
            self.device = torch.device("cpu")
        self.models = []
        for name in sorted(os.listdir(model_dir)):
            if not name.endswith(".pth"):
                continue
            h_input, w_input, model_type, scale = parse_model_name(name)
            kernel_size = get_kernel(h_input, w_input)
            model = MODEL_MAPPING[model_type](conv6_kernel=kernel_size).to(self.device)
            state_path = os.path.join(model_dir, name)
            try:
                state_dict = torch.load(state_path, map_location=self.device, weights_only=True)
            except TypeError:
                state_dict = torch.load(state_path, map_location=self.device)
            if any(k.startswith("module.") for k in state_dict.keys()):
                state_dict = {k[7:]: v for k, v in state_dict.items()}
            model.load_state_dict(state_dict)
            model.eval()
            self.models.append((model, h_input, w_input, scale))
        if not self.models:
            raise FileNotFoundError(f"No .pth anti-spoofing models found in {model_dir}")

    def predict_probs(self, image_bgr, bbox):
        """Returns averaged class probabilities [fake0, real, fake2]."""
        prediction = np.zeros(3, dtype=np.float32)
        with torch.no_grad():
            for model, h_input, w_input, scale in self.models:
                if scale is None:
                    patch = cv2.resize(image_bgr, (w_input, h_input))
                else:
                    patch = CropImage.crop(image_bgr, bbox, scale, w_input, h_input, crop=True)
                # NOTE: reference repo's to_tensor does NOT divide by 255
                # (div255 line is commented out in their functional.py)
                tensor = torch.from_numpy(patch.astype(np.float32))
                tensor = tensor.permute(2, 0, 1).unsqueeze(0).to(self.device)
                logits = model(tensor)
                prediction += F.softmax(logits, dim=1).cpu().numpy()[0]
        return prediction / len(self.models)

    def predict(self, image_bgr, bbox):
        probs = self.predict_probs(image_bgr, bbox)
        label = int(np.argmax(probs))
        return label, float(probs[label])
