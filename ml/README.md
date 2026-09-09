# ml/ — YOLO 推論服務骨架（optional）

把 defect 影像丟進來、回傳 detection 的最小服務。**預設用 mock detector，
不需要任何模型權重**，讓「YOLO → FMA 表格預填」這條路徑在 demo 端就能跑通。

## 快速啟動（mock）

```bash
cd ml
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

```bash
curl -F file=@some.jpg http://localhost:8000/detect
# { "detector": "mock", "detections": [ { "class": "scratch", "confidence": 0.83, "bbox": [..] } ] }
```

然後在 `server/.env` 設 `DETECTOR_URL=http://localhost:8000/detect`。
不設的話，server 端的 ingestion 會直接用內建的 mock，不必啟動這個服務。

## 換成真的 YOLOv10

1. `pip install ultralytics torch`（見 `requirements.txt` 註解）
2. 建一個 `yolo_detector.py`，實作 `detect(image_bytes: bytes) -> list[dict]`，
   內部載入你的 `.pt` 權重
3. 在 `app.py` 的 `get_detector()` 回傳你的實作
4. detection 的 `class` 用 `classes.json` 裡的 `name`

## 檔案

| 檔 | 用途 |
|---|---|
| `app.py` | FastAPI：`POST /detect`、`GET /health`、`GET /classes` |
| `mock_detector.py` | 假 detector（用圖片內容當種子，同圖同結果） |
| `classes.json` | 12 類缺陷（`id` / `name` / `label`），與 `server/config/defectTypes.js` 同源 |
| `requirements.txt` | 骨架依賴（真模型的依賴以註解列出） |

> 訓練權重（`.pt`）、訓練腳本、資料集**不隨附**——那是各場域自己的東西。
> `ml/weights/` 與 `*.pt` 已列入 `.gitignore`。
