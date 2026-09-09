"""最小 YOLO 推論服務骨架（optional）。

POST /detect  (multipart: file=<image>)  ->  { "detector": "...", "detections": [...] }

- 預設用 mock_detector（無需權重），讓整條 YOLO -> FMA 預填流程在 demo 端跑得通。
- 要接真的 YOLOv10：
  1. pip install ultralytics
  2. 把下面的 get_detector() 換成載入你的 .pt 權重的實作
  3. detections 的 `class` 用 ml/classes.json 裡的 name

啟動：
    pip install -r requirements.txt
    uvicorn app:app --host 0.0.0.0 --port 8000

然後在 server/.env 設 DETECTOR_URL=http://localhost:8000/detect
（server 端的 ingestion adapter 會呼叫它；沒設就用 server 內建的 mock。）
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, File, UploadFile

from mock_detector import MockDetector

app = FastAPI(title="FMA 良率平台 — YOLO 推論骨架")

_CLASSES = json.loads((Path(__file__).parent / "classes.json").read_text(encoding="utf-8"))


def get_detector():
    # 換成真模型時改這裡，例如：
    #   from yolo_detector import YoloDetector
    #   return YoloDetector(weights="weights/best.pt")
    return MockDetector()


detector = get_detector()


@app.get("/health")
def health():
    return {"ok": True, "detector": detector.name, "classes": len(_CLASSES["classes"])}


@app.get("/classes")
def classes():
    return _CLASSES


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    data = await file.read()
    return {"detector": detector.name, "detections": detector.detect(data)}
