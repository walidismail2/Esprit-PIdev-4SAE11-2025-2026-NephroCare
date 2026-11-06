#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Improved Kidney Disease Classification Model
-------------------------------------------
Implements best practices for medical imaging:
1. Transfer Learning with MobileNetV2
2. Strong data augmentation for CT scans
3. Proper regularization techniques
4. Fine-tuning strategy
5. Monitoring val_loss (not accuracy)
"""

import os
import random
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.models import Model
from sklearn.utils.class_weight import compute_class_weight
from PIL import Image
import warnings
warnings.filterwarnings('ignore')

# For reproducibility
SEED = 42
np.random.seed(SEED)
tf.random.set_seed(SEED)
random.seed(SEED)

# Configuration
ROOT = os.path.dirname(os.path.abspath(__file__))
BASE_PATH = os.path.join(
    ROOT,
    "archive",
    "CT-KIDNEY-DATASET-Normal-Cyst-Tumor-Stone",
    "CT-KIDNEY-DATASET-Normal-Cyst-Tumor-Stone",
)
CLASSES = ["Cyst", "Normal", "Stone", "Tumor"]
IMG_SIZE = (224, 224)  # Increased for better feature extraction with MobileNetV2
BATCH_SIZE = 32
EPOCHS = 50  # Increased, with early stopping
LEARNING_RATE = 1e-3
FINE_TUNING_LR = 1e-5
OUTPUT_PATH = "kidney_model_improved"  # Save model outputs here

# Create output directory
os.makedirs(OUTPUT_PATH, exist_ok=True)

def main():
    """Main execution function"""
    print("=== Improved Kidney Disease Classification ===")
    
    # Step 1: Data augmentation (CRITICAL for medical imaging)
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=10,        # CT scans shouldn't be rotated too much
        zoom_range=0.1,           # Subtle zoom
        width_shift_range=0.05,   # Small shifts
        height_shift_range=0.05,  # Small shifts
        horizontal_flip=True,     # OK for kidneys
        brightness_range=[0.9, 1.1],  # Subtle brightness changes
        validation_split=0.2      # 20% validation
    )
    
    # No augmentation for validation
    val_datagen = ImageDataGenerator(
        rescale=1./255,
        validation_split=0.2
    )
    
    print("Loading and preparing training data...")
    train_gen = train_datagen.flow_from_directory(
        BASE_PATH,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training',
        seed=SEED
    )
    
    print("Loading and preparing validation data...")
    val_gen = val_datagen.flow_from_directory(
        BASE_PATH,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation',
        seed=SEED
    )
    
    # Step 2: Class weights to handle class imbalance
    class_weights_arr = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(train_gen.classes),
        y=train_gen.classes
    )
    class_weights = dict(enumerate(class_weights_arr))
    print("Class weights:", {CLASSES[k]: f"{v:.2f}" for k, v in class_weights.items()})
    
    # Step 3: Build Transfer Learning model with MobileNetV2
    print("Building MobileNetV2 transfer learning model...")
    base_model = MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights='imagenet'
    )
    base_model.trainable = False  # Initially freeze the base model
    
    # Build model with proper regularization
    inputs = tf.keras.Input(shape=(224, 224, 3))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    
    # Strong regularization to prevent overfitting
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.5)(x)  # High dropout rate
    x = layers.Dense(64, activation='relu')(x)
    x = layers.Dropout(0.5)(x)  # High dropout rate
    outputs = layers.Dense(4, activation='softmax')(x)
    
    model = Model(inputs, outputs, name="KidneyCNN_Improved")
    
    # Step 4: Proper callbacks focusing on val_loss
    # Use val_loss, not accuracy, for early stopping and checkpoints
    callbacks_list = [
        callbacks.EarlyStopping(
            monitor='val_loss',  # CRITICAL change
            patience=5,
            restore_best_weights=True
        ),
        callbacks.ModelCheckpoint(
            os.path.join(OUTPUT_PATH, 'best_cnn_kidney.keras'),
            monitor='val_loss',  # CRITICAL change
            save_best_only=True
        ),
        callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-6
        ),
        callbacks.TensorBoard(log_dir=os.path.join(OUTPUT_PATH, 'logs'))
    ]
    
    # Step 5: Compile model with appropriate parameters
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # Display model architecture
    model.summary()
    
    # Step 6: Train the model (first phase - feature extraction only)
    print("Starting initial training phase (base model frozen)...")
    history = model.fit(
        train_gen,
        epochs=20,  # Initial epochs before fine-tuning
        validation_data=val_gen,
        class_weight=class_weights,
        callbacks=callbacks_list,
        verbose=1
    )
    
    # Step 7: Fine-tuning - unfreeze later layers in base model
    print("\n\nStarting fine-tuning phase...")
    # Unfreeze the base model
    base_model.trainable = True
    
    # Freeze all layers except the last 30
    for layer in base_model.layers[:-30]:
        layer.trainable = False
        
    # Compile with a lower learning rate
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=FINE_TUNING_LR),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # Continue training with fine-tuning
    fine_tune_history = model.fit(
        train_gen,
        epochs=EPOCHS,
        initial_epoch=len(history.history['loss']),
        validation_data=val_gen,
        class_weight=class_weights,
        callbacks=callbacks_list,
        verbose=1
    )
    
    # Combine histories
    history_combined = {}
    for k in history.history:
        history_combined[k] = history.history[k] + fine_tune_history.history[k]
    
    # Step 8: Plot learning curves
    plot_learning_curves(history_combined, OUTPUT_PATH)
    
    # Step 9: Evaluate on validation set
    evaluate_model(model, val_gen, OUTPUT_PATH)
    
    # Save the final model
    model.save(os.path.join(OUTPUT_PATH, 'final_kidney_model.keras'))
    print(f"Model saved to {os.path.join(OUTPUT_PATH, 'final_kidney_model.keras')}")
    
    print("Training complete!")
    
def plot_learning_curves(history, output_path):
    """Plot and save training and validation curves"""
    epochs_range = range(1, len(history['accuracy']) + 1)
    
    plt.figure(figsize=(14, 5))
    plt.subplot(1, 2, 1)
    plt.plot(epochs_range, history['accuracy'], 'b-o', label='Train Accuracy')
    plt.plot(epochs_range, history['val_accuracy'], 'r-o', label='Val Accuracy')
    plt.title('Accuracy')
    plt.xlabel('Epochs')
    plt.ylabel('Accuracy')
    plt.legend()
    plt.grid(alpha=0.3)
    
    plt.subplot(1, 2, 2)
    plt.plot(epochs_range, history['loss'], 'b-o', label='Train Loss')
    plt.plot(epochs_range, history['val_loss'], 'r-o', label='Val Loss')
    plt.title('Loss (Cross-Entropy)')
    plt.xlabel('Epochs')
    plt.ylabel('Loss')
    plt.legend()
    plt.grid(alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_path, 'learning_curves.png'), dpi=150, bbox_inches='tight')
    
def evaluate_model(model, val_gen, output_path):
    """Evaluate model performance and generate confusion matrix"""
    from sklearn.metrics import classification_report, confusion_matrix
    import seaborn as sns
    
    # Reset generator
    val_gen.reset()
    
    # Predict classes
    y_true = val_gen.classes
    y_pred_proba = model.predict(val_gen, verbose=1)
    y_pred = np.argmax(y_pred_proba, axis=1)
    
    # Class names for reports
    class_names = list(val_gen.class_indices.keys())
    
    # Generate classification report
    report = classification_report(y_true, y_pred, target_names=class_names)
    print("\n=== Classification Report ===")
    print(report)
    
    # Save report to file
    with open(os.path.join(output_path, 'classification_report.txt'), 'w') as f:
        f.write(report)
    
    # Generate confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=class_names, yticklabels=class_names,
                linewidths=0.5, linecolor='white')
    plt.title('Confusion Matrix - Validation Set', fontsize=14, fontweight='bold')
    plt.ylabel('True Class')
    plt.xlabel('Predicted Class')
    plt.tight_layout()
    plt.savefig(os.path.join(output_path, 'confusion_matrix.png'), dpi=150, bbox_inches='tight')
    
if __name__ == "__main__":
    main()