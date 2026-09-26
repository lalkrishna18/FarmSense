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

FEATURE_NAMES = {
    "N": "nitrogen",
    "P": "phosphorus",
    "K": "potassium",
    "temperature": "temperature",
    "humidity": "humidity",
    "ph": "pH",
    "rainfall": "rainfall"
}


def load_crop_profiles():
    data = pd.read_csv("ml/data/crop_data.csv")

    return data.groupby("label")[FEATURES].median()


CROP_PROFILES = load_crop_profiles()


def get_reasons(input_values, crop):
    profile = CROP_PROFILES.loc[crop]

    differences = []

    for feature in FEATURES:
        input_value = input_values[feature]
        median_value = profile[feature]

        # Relative difference lets us compare features
        # that have very different numeric scales.
        if median_value != 0:
            difference = abs(input_value - median_value) / abs(median_value)
        else:
            difference = abs(input_value - median_value)

        differences.append(
            (feature, difference, input_value, median_value)
        )

    # Smaller difference = closer to the crop's training-data pattern.
    differences.sort(key=lambda x: x[1])

    reasons = []

    for feature, difference, input_value, median_value in differences[:3]:
        name = FEATURE_NAMES[feature]

        reasons.append(
            f"{name.capitalize()} ({input_value:g}) "
            f"is close to the training-data median for {crop} ({median_value:g})"
        )

    return reasons


def recommend_crops(
    N,
    P,
    K,
    temperature,
    humidity,
    ph,
    rainfall,
    top_n=3
):

    input_values = {
        "N": N,
        "P": P,
        "K": K,
        "temperature": temperature,
        "humidity": humidity,
        "ph": ph,
        "rainfall": rainfall
    }

    values = pd.DataFrame(
        [[N, P, K, temperature, humidity, ph, rainfall]],
        columns=FEATURES
    )

    probabilities = model.predict_proba(values)[0]
    classes = model.classes_

    ranked = probabilities.argsort()[::-1][:top_n]

    recommendations = []

    for i in ranked:
        crop = str(classes[i])
        score = float(probabilities[i])

        recommendations.append({
            "crop": crop,
            "score": round(score, 4),
            "reasons": get_reasons(input_values, crop)
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