import joblib
import pandas as pd

model = joblib.load("ml/model.pkl")

FEATURES = [
    "N",
    "P",
    "K",
    "temperature",
    "humidity",
    "ph",
    "rainfall"
]


def recommend_crops(N, P, K, temperature, humidity, ph, rainfall, top_n=3):

    values = pd.DataFrame(
        [[N, P, K, temperature, humidity, ph, rainfall]],
        columns=FEATURES
    )

    probabilities = model.predict_proba(values)[0]
    classes = model.classes_

    ranked = probabilities.argsort()[::-1][:top_n]

    recommendations = []

    for i in ranked:
        recommendations.append({
            "crop": str(classes[i]),
            "score": round(float(probabilities[i]), 4)
        })

    return {
        "recommendations": recommendations
    }


if __name__ == "__main__":

    result = recommend_crops(
        90,
        42,
        43,
        25.5,
        80,
        6.5,
        200
    )

    print(result)