import os
from io import BytesIO

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image

CLASSES = ["Cyst", "Normal", "Stone", "Tumor"]
IMG_SIZE = (224, 224)
RECOMMENDATIONS = {
    "Cyst": "Possible cyst. Schedule ultrasound follow-up and a radiology review.",
    "Normal": "No obvious abnormality on this image. Continue routine follow-up.",
    "Stone": "Possible kidney stone. Confirm with ultrasound and review pain management.",
    "Tumor": "Possible tumor. Request urgent radiology and oncology review.",
}

app = FastAPI(title="NephroCare Kidney CT")
_model = None
_load_error = None


def model_path() -> str:
    return os.environ.get(
        "MODEL_PATH",
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "Kidney Project IA",
            "kidney_model_improved",
            "best_cnn_kidney.keras",
        ),
    )


def get_model():
    global _model, _load_error
    if _model is not None:
        return _model
    if _load_error is not None:
        return None
    path = model_path()
    if not os.path.isfile(path):
        _load_error = f"Model file not found at {path}"
        return None
    try:
        from tensorflow.keras.models import load_model
        _model = load_model(path)
        return _model
    except Exception as exc:
        _load_error = str(exc)
        return None


@app.get("/health")
def health():
    loaded = get_model() is not None
    return {"status": "up" if loaded else "model-unavailable", "detail": _load_error}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    model = get_model()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail=_load_error or "Install TensorFlow and mount best_cnn_kidney.keras to run predictions.",
        )
    raw = await file.read()
    try:
        image = Image.open(BytesIO(raw)).convert("RGB").resize(IMG_SIZE)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read image: {exc}") from exc
    pixels = np.expand_dims(np.array(image) / 255.0, axis=0)
    probabilities = model.predict(pixels, verbose=0)[0]
    index = int(np.argmax(probabilities))
    label = CLASSES[index]
    return {
        "label": label,
        "confidence": float(probabilities[index]),
        "recommendation": RECOMMENDATIONS[label],
        "probabilities": {name: float(value) for name, value in zip(CLASSES, probabilities)},
    }
