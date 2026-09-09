"""內建的假 detector：不需要任何模型權重，回傳看起來合理的隨機 detection。

換成真的 YOLO：實作一個同樣介面的類別（`detect(image_bytes) -> list[dict]`），
在 app.py 裡把 MockDetector 換掉即可。
"""
from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

_CLASSES = json.loads((Path(__file__).parent / "classes.json").read_text(encoding="utf-8"))["classes"]


class MockDetector:
    name = "mock"

    def detect(self, image_bytes: bytes) -> list[dict]:
        # 用圖片內容當種子，讓同一張圖每次結果一致
        seed = int(hashlib.sha1(image_bytes or b"empty").hexdigest(), 16) % (2**32)
        rng = random.Random(seed)
        n = rng.randint(1, 3)
        out = []
        for _ in range(n):
            cls = rng.choice(_CLASSES)
            out.append(
                {
                    "class": cls["name"],
                    "confidence": round(rng.uniform(0.55, 0.98), 2),
                    "bbox": [
                        rng.randint(0, 220),
                        rng.randint(0, 220),
                        rng.randint(20, 90),
                        rng.randint(20, 90),
                    ],
                }
            )
        return out
