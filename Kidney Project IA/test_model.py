#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Test script for Kidney Classification Model
------------------------------------------
Loads the trained model and runs predictions on test images.
"""

import os
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from PIL import Image
import random

# Configuration
ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(ROOT, "kidney_model_improved", "best_cnn_kidney.keras")
BASE_PATH = os.path.join(
    ROOT,
    "archive",
    "CT-KIDNEY-DATASET-Normal-Cyst-Tumor-Stone",
    "CT-KIDNEY-DATASET-Normal-Cyst-Tumor-Stone",
)
CLASSES = ["Cyst", "Normal", "Stone", "Tumor"]
IMG_SIZE = (224, 224)

# Clinical recommendation system based on confidence levels
RECOMMENDATION_MAP = {
    'Cyst':   {
        'high':   "🔵 Kyste confirmé — Suivi échographique périodique (6 mois). Pas d'urgence.",
        'medium': "🟡 Kyste probable — Examen complémentaire recommandé (IRM ou échographie).",
        'low':    "⚠️ Diagnostic incertain — Consultation radiologique approfondie nécessaire."
    },
    'Normal': {
        'high':   "✅ Rein normal — Suivi de routine annuel. Aucune intervention requise.",
        'medium': "🟡 Probablement normal — Recontrôler dans 6 mois.",
        'low':    "⚠️ Incertitude diagnostique — Avis médical requis."
    },
    'Tumor':  {
        'high':   "🔴 URGENT — Tumeur détectée avec forte probabilité. Biopsie et consultation oncologique immédiate.",
        'medium': "🟠 Tumeur suspectée — Imagerie complémentaire (PET-scan) + avis oncologique urgent.",
        'low':    "⚠️ Diagnostic incertain — Examen multi-disciplinaire indispensable."
    },
    'Stone':  {
        'high':   "🟤 Calcul rénal confirmé — Analgésie + traitement selon taille (lithotripsie ou chirurgie).",
        'medium': "🟡 Calcul probable — Hydratation intensive + AINS + bilan urinaire.",
        'low':    "⚠️ Calcul possible — Échographie de confirmation recommandée."
    }
}

def generate_recommendation(image_path, model, threshold_high=0.80, threshold_mid=0.55):
    """Generate a clinical recommendation based on model prediction"""
    # Load and preprocess image
    img = Image.open(image_path).convert('RGB').resize(IMG_SIZE)
    img_array = np.array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    
    # Get prediction
    probas = model.predict(img_array, verbose=0)[0]
    pred_idx = np.argmax(probas)
    pred_class = CLASSES[pred_idx]
    confidence = probas[pred_idx]
    
    # Determine confidence level
    if confidence >= threshold_high:
        level = 'high'
    elif confidence >= threshold_mid:
        level = 'medium'
    else:
        level = 'low'
    
    # Get recommendation
    reco = RECOMMENDATION_MAP[pred_class][level]
    
    # Print detailed report
    print("=" * 60)
    print(f"📋 DIAGNOSTIC REPORT")
    print("=" * 60)
    print(f"Predicted class: {pred_class}")
    print(f"Confidence     : {confidence:.1%}  [{level.upper()}]")
    print("\nSoftmax probabilities:")
    for cls, p in zip(CLASSES, probas):
        bar = '█' * int(p * 30)
        print(f"  {cls:<8}: {bar:<30} {p:.1%}")
    print(f"\n💊 Clinical recommendation:")
    print(f"   {reco}")
    print("=" * 60)
    
    return pred_class, confidence, level, reco

def main():
    print("Loading model...")
    model = tf.keras.models.load_model(MODEL_PATH)
    
    # Test on a random image from each class
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    axes = axes.flatten()
    
    for i, cls in enumerate(CLASSES):
        # Get random image
        folder = os.path.join(BASE_PATH, cls)
        files = os.listdir(folder)
        test_file = random.choice(files)
        test_path = os.path.join(folder, test_file)
        
        # Display image
        img = Image.open(test_path)
        axes[i].imshow(img)
        
        # Generate recommendation
        pred_class, confidence, level, reco = generate_recommendation(test_path, model)
        
        # Color based on prediction correctness
        color = 'green' if pred_class == cls else 'red'
        
        # Set title with prediction info
        axes[i].set_title(
            f"True: {cls}\nPredicted: {pred_class} ({confidence:.1%})",
            fontsize=10,
            color=color
        )
        
        # Remove axes
        axes[i].axis('off')
        
    plt.tight_layout()
    plt.savefig("kidney_model_improved/test_predictions.png")
    plt.show()

if __name__ == "__main__":
    main()