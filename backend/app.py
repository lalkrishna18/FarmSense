import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template, request, jsonify
from ml.predict import recommend_crops
from backend.price_database import (
    initialize_database,
    get_all_prices,
    update_price
)

app = Flask(
    __name__,
    template_folder="../frontend/templates",
    static_folder="../frontend/static"
)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "FarmSense backend"
    }


@app.route("/api/recommend", methods=["POST"])
def recommend():
    try:
        data = request.get_json()

        required_fields = [
            "N",
            "P",
            "K",
            "temperature",
            "humidity",
            "ph",
            "rainfall"
        ]

        # Check that all required inputs exist
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "error": f"Missing field: {field}"
                }), 400

        # Convert inputs to numbers
        N = float(data["N"])
        P = float(data["P"])
        K = float(data["K"])
        temperature = float(data["temperature"])
        humidity = float(data["humidity"])
        ph = float(data["ph"])
        rainfall = float(data["rainfall"])

        # Call the ML model
        result = recommend_crops(
            N,
            P,
            K,
            temperature,
            humidity,
            ph,
            rainfall
        )

        return jsonify(result)

    except (TypeError, ValueError):
        return jsonify({
            "error": "All input values must be numbers"
        }), 400

    except Exception as e:
        return jsonify({
            "error": "Prediction failed",
            "details": str(e)
        }), 500
# ============================================================
# MARKET PRICE API
# ============================================================

MARKET_DATA = {
    "Apple": {
        "price": 3200,
        "trend": "+1.8%",
        "direction": "up",
        "history": [2900, 2950, 3000, 3050, 3150, 3200]
    },
    "Banana": {
        "price": 1800,
        "trend": "+2.3%",
        "direction": "up",
        "history": [1650, 1680, 1720, 1750, 1780, 1800]
    },
    "Blackgram": {
        "price": 6200,
        "trend": "+1.5%",
        "direction": "up",
        "history": [5800, 5900, 6000, 6050, 6150, 6200]
    },
    "Chickpea": {
        "price": 5600,
        "trend": "+2.0%",
        "direction": "up",
        "history": [5200, 5300, 5400, 5450, 5550, 5600]
    },
    "Coconut": {
        "price": 3400,
        "trend": "+3.1%",
        "direction": "up",
        "history": [3100, 3150, 3200, 3250, 3350, 3400]
    },
    "Coffee": {
        "price": 7800,
        "trend": "+2.6%",
        "direction": "up",
        "history": [7100, 7250, 7350, 7450, 7600, 7800]
    },
    "Cotton": {
        "price": 6200,
        "trend": "+5.2%",
        "direction": "up",
        "history": [5800, 5900, 6000, 6050, 6100, 6200]
    },
    "Grapes": {
        "price": 4200,
        "trend": "+2.4%",
        "direction": "up",
        "history": [3800, 3900, 4000, 4050, 4150, 4200]
    },
    "Jute": {
        "price": 4800,
        "trend": "+1.7%",
        "direction": "up",
        "history": [4500, 4550, 4600, 4650, 4750, 4800]
    },
    "Kidney Beans": {
        "price": 5400,
        "trend": "+1.9%",
        "direction": "up",
        "history": [5000, 5100, 5200, 5250, 5350, 5400]
    },
    "Lentil": {
        "price": 6100,
        "trend": "+2.2%",
        "direction": "up",
        "history": [5700, 5800, 5900, 5950, 6050, 6100]
    },
    "Maize": {
        "price": 1820,
        "trend": "-2.1%",
        "direction": "down",
        "history": [1950, 1920, 1900, 1880, 1850, 1820]
    },
    "Mango": {
        "price": 4500,
        "trend": "+3.5%",
        "direction": "up",
        "history": [4000, 4100, 4200, 4300, 4400, 4500]
    },
    "Moth Beans": {
        "price": 5200,
        "trend": "+1.6%",
        "direction": "up",
        "history": [4900, 4950, 5000, 5050, 5150, 5200]
    },
    "Mung Bean": {
        "price": 6800,
        "trend": "+2.8%",
        "direction": "up",
        "history": [6200, 6350, 6450, 6550, 6700, 6800]
    },
    "Muskmelon": {
        "price": 2800,
        "trend": "+2.5%",
        "direction": "up",
        "history": [2500, 2550, 2600, 2650, 2750, 2800]
    },
    "Orange": {
        "price": 3600,
        "trend": "+1.9%",
        "direction": "up",
        "history": [3300, 3350, 3400, 3450, 3550, 3600]
    },
    "Papaya": {
        "price": 2500,
        "trend": "+2.1%",
        "direction": "up",
        "history": [2200, 2250, 2300, 2350, 2450, 2500]
    },
    "Pigeon Peas": {
        "price": 5900,
        "trend": "+2.3%",
        "direction": "up",
        "history": [5500, 5600, 5700, 5750, 5850, 5900]
    },
    "Pomegranate": {
        "price": 7200,
        "trend": "+3.0%",
        "direction": "up",
        "history": [6500, 6650, 6800, 6950, 7100, 7200]
    },
    "Rice": {
        "price": 2450,
        "trend": "+2.1%",
        "direction": "up",
        "history": [2200, 2250, 2300, 2380, 2400, 2450]
    },
    "Watermelon": {
        "price": 2800,
        "trend": "+2.9%",
        "direction": "up",
        "history": [2500, 2550, 2600, 2650, 2750, 2800]
    }
}

# Initialize the officer price database using the existing market prices.
initialize_database(MARKET_DATA)

@app.route("/api/market/<crop>")
def market(crop):

    # Match crop names case-insensitively.
    # ML may return "rice", while market data uses "Rice".
    matched_crop = next(
        (
            name
            for name in MARKET_DATA
            if name.lower() == crop.lower()
        ),
        None
    )

    if matched_crop is None:
        return jsonify({
            "error": f"Market data not found for {crop}"
        }), 404

    data = MARKET_DATA[matched_crop]

    return jsonify({
        "crop": matched_crop,
        **data
    })
@app.route("/api/officer/prices", methods=["GET"])
def officer_prices():
    return jsonify({
        "prices": get_all_prices()
    })

@app.route("/api/officer/prices/<crop>", methods=["PUT"])
def update_officer_price(crop):
    data = request.get_json(silent=True)

    if not data or "base_price" not in data:
        return jsonify({
            "error": "base_price is required"
        }), 400

    try:
        base_price = float(data["base_price"])
    except (TypeError, ValueError):
        return jsonify({
            "error": "base_price must be a valid number"
        }), 400

    if base_price < 0:
        return jsonify({
            "error": "base_price cannot be negative"
        }), 400

    updated = update_price(crop, base_price)

    if not updated:
        return jsonify({
            "error": f"Crop not found: {crop}"
        }), 404

    return jsonify({
        "message": "Base price updated successfully",
        "crop": crop,
        "base_price": base_price
    })

if __name__ == "__main__":
    app.run(debug=True)