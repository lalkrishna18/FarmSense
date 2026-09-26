from flask import Flask, render_template, request, jsonify
from ml.predict import recommend_crops

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


if __name__ == "__main__":
    app.run(debug=True)