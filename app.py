import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import pickle


model_path = "cnn_model.h5"
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Model file '{model_path}' not found!")

model = tf.keras.models.load_model(model_path, compile=False)
model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])

label_encoder = None
label_encoder_path = "label_encoder.pkl"

STRESS_LEVEL_MAPPING = {
    0: 'Normal',
    1: 'Mild',
    2: 'Moderate',
    3: 'High',
    4: 'Severe'
}

if os.path.exists(label_encoder_path):
    try:
        with open(label_encoder_path, "rb") as le_file:
            label_encoder = pickle.load(le_file)
        print(" Label encoder loaded successfully")
    except Exception as e:
        print(f" Warning: Could not load label encoder: {e}. Using hardcoded mapping.")
        label_encoder = None
else:
    print(" Label encoder file not found. Using hardcoded stress level mapping.")

app = Flask(__name__)
CORS(app)

try:
    if model.input_shape is None or len(model.input_shape) < 2:
        raise ValueError("Model input shape is invalid")
    INPUT_SHAPE = model.input_shape[1] 
    if INPUT_SHAPE < 5:
        raise ValueError(f"Input shape ({INPUT_SHAPE}) must be at least 5")
except Exception as e:
    print(f"Error setting INPUT_SHAPE: {e}")
    INPUT_SHAPE = 5  

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"})
        
       
        required_fields = ['beta', 'gamma', 'delta', 'alpha', 'theta']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"})
        
        beta = float(data['beta'])
        gamma = float(data['gamma'])
        delta = float(data['delta'])
        alpha = float(data['alpha'])
        theta = float(data['theta'])

        
        padding_size = max(0, INPUT_SHAPE - 5)  
        input_eeg = [beta, gamma, delta, alpha, theta] + [0] * padding_size
        
        if len(input_eeg) != INPUT_SHAPE:
            return jsonify({"error": f"Input size mismatch: expected {INPUT_SHAPE}, got {len(input_eeg)}"})
        
        input_data = np.array([input_eeg]).reshape((1, INPUT_SHAPE, 1))

        
        prediction = model.predict(input_data, verbose=0)
        predicted_class = int(np.argmax(prediction))
        
        
        if predicted_class < 0:
            return jsonify({"error": f"Invalid predicted class: {predicted_class}"})

        
        if label_encoder is not None:
            
            try:
                inverse_result = label_encoder.inverse_transform([predicted_class])
                if len(inverse_result) == 0:
                    return jsonify({"error": "Label encoder returned empty result"})
                predicted_stress_level = inverse_result[0]
            except (ValueError, IndexError) as e:
                print(f"Label encoder error: {e}. Falling back to hardcoded mapping.")
                
                predicted_stress_level = STRESS_LEVEL_MAPPING.get(predicted_class, 'Moderate')
        else:
            
            predicted_stress_level = STRESS_LEVEL_MAPPING.get(predicted_class, 'Moderate')
        
        
        if predicted_stress_level not in STRESS_LEVEL_MAPPING.values():
            return jsonify({"error": f"Invalid stress level: {predicted_stress_level}. Predicted class: {predicted_class}"})

        return jsonify({"prediction": predicted_stress_level})

    except KeyError as e:
        return jsonify({"error": f"Missing required field: {str(e)}"})
    except ValueError as e:
        return jsonify({"error": f"Invalid input value: {str(e)}"})
    except Exception as e:
        return jsonify({"error": f"Prediction error: {str(e)}"})

if __name__ == "__main__":
    app.run(debug=True)