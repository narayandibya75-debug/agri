# ==============================
# IMPORTS
# ==============================
#from unittest import result
import os

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
import io

from fertilizer_logic import recommend_fertilizer
from disease_cure import get_cure
from irrigation_model import get_weather


import os
import gdown

def download_model(file_id, output):
    if not os.path.exists(output):
        print(f"Downloading {output}...")
        url = f"https://drive.google.com/uc?id={file_id}"
        gdown.download(url, output, quiet=False)

# 🔥 Replace with your file IDs
download_model("1w5F68buoOIMjuDntzn2-Pv1k2lD6ZY-y", "leaf_model.pth")
download_model("1YGZu2J0dYTQCYeWKTFrxyNPx_lPsxkQM", "classes.pth")
download_model("1cZvhsTBkXqij2mqIhvK7MDosfOQjCba1", "crop_model.pkl")
download_model("1LOEAAL4nzUNb_X5S1B7HaQX5ZZZeyHxG", "yield_model.pkl")
# ==============================
# INIT APP
# ==============================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# LOAD MODELS
# ==============================
print("🔄 Loading models...")

# Crop model
crop_model = joblib.load("crop_model.pkl")

# Yield model
yield_model = joblib.load("yield_model.pkl")

# Disease model
classes = torch.load("classes.pth")

model = models.resnet18(weights=None)
model.fc = nn.Linear(model.fc.in_features, len(classes))
model.load_state_dict(torch.load("leaf_model.pth", map_location="cpu"))
model.eval()

# Image transform (IMPORTANT: must match training)
transform = transforms.Compose([
    transforms.Resize((128,128)),
    transforms.ToTensor(),
])

print("✅ All models loaded successfully!")

# ==============================
# HOME
# ==============================
@app.get("/")
def home():
    return {"message": "AgriAI Running 🚀"}

# ==============================
# 🌾 CROP PREDICTION
# ==============================
@app.get("/predict_crop")
def predict_crop(N: float, P: float, K: float,
                 temperature: float, humidity: float,
                 ph: float, rainfall: float):

    df = pd.DataFrame([{
        "N": N,
        "P": P,
        "K": K,
        "temperature": temperature,
        "humidity": humidity,
        "ph": ph,
        "rainfall": rainfall
    }])

    pred = crop_model.predict(df)

    return {"crop": pred[0]}

# ==============================
# 🌱 FERTILIZER
# ==============================
@app.get("/fertilizer")
def fertilizer(N: float, P: float, K: float, ph: float):

    result = recommend_fertilizer(N, P, K, ph)

    return {"fertilizer": result}

# ==============================
# 📈 YIELD PREDICTION
# ==============================
@app.get("/predict_yield")
def predict_yield(temperature: float, rainfall: float,
                  ph: float, N: float, P: float, K: float):

    df = pd.DataFrame([{
        "temperature": temperature,
        "rainfall": rainfall,
        "ph": ph,
        "N": N,
        "P": P,
        "K": K
    }])

    pred = yield_model.predict(df)

    return {"predicted_yield": float(pred[0])}

# ==============================
# 🦠 DISEASE DETECTION
# ==============================
@app.post("/predict_disease")
async def predict_disease(file: UploadFile = File(...)):

    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = transform(image).unsqueeze(0)

    with torch.no_grad():
        outputs = model(image)
        probs = torch.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probs, 1)

    disease_raw = classes[predicted.item()]
    confidence_val = confidence.item()

    result = get_cure(disease_raw, confidence)

    return result   # 🔥 return full expert data

# ==============================
# 🌧️ IRRIGATION AI (SMART LOGIC)
# ==============================

@app.post("/irrigation_ai")
def irrigation_ai(data: dict):

    moisture = data.get("moisture")
    ph = data.get("ph")
    city = data.get("city")

    weather = get_weather(city)

    if weather is None:
        return {"error": "Invalid city name"}

    temp, humidity, rainfall = weather

    # AI Logic
    if rainfall > 3:
        pump = "OFF"
        reason = "Rain expected 🌧️"

    elif moisture < 30 and temp > 30:
        pump = "ON"
        reason = "Hot + Dry soil 🔥💧"

    elif humidity > 85:
        pump = "OFF"
        reason = "High humidity, avoid fungal growth"

    elif moisture < 40:
        pump = "ON"
        reason = "Soil moisture low"

    else:
        pump = "OFF"
        reason = "Optimal conditions"

    return {
        "pump": pump,
        "reason": reason,
        "weather": {
            "temperature": temp,
            "humidity": humidity,
            "rainfall": rainfall
        }
    }
