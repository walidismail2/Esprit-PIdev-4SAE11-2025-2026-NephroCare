# Improved Kidney Disease Classification

This repository contains an improved implementation of a kidney disease classification system using deep learning. The system can identify four types of kidney conditions from CT scans:

- Normal
- Cyst
- Stone
- Tumor

## ✅ Key Improvements

The updated model addresses the main issues that were leading to only ~60% validation accuracy:

1. **Transfer Learning with MobileNetV2** - instead of training a CNN from scratch, we leverage pre-trained weights from ImageNet
2. **Improved Data Augmentation** - specific transformations tailored for CT scans
3. **Strong Regularization** - higher dropout rates to prevent overfitting
4. **Monitoring val_loss** - using the right metric for early stopping and checkpoints
5. **Fine-tuning Strategy** - unfreezing later layers after initial training

## 📈 Expected Performance Improvement

| Metric           | Original Model | Improved Model |
|------------------|---------------|---------------|
| Validation Accuracy | ~60-65%      | 75-85%        |
| Overfitting     | Severe       | Minimal       |
| Validation Loss  | Increasing    | Decreasing    |

## 🚀 Getting Started

### Prerequisites

- Python 3.7+
- TensorFlow 2.x
- Scikit-learn
- Matplotlib, NumPy, Pillow

### Training the Model

```bash
# Navigate to the project directory
cd "Kidney Project IA"

# Run the improved training script
python improved_kidney_classifier.py
```

### Testing the Model

After training is complete, you can test the model on sample images:

```bash
python test_model.py
```

## 🔧 Implementation Details

### 1. Transfer Learning with MobileNetV2

```python
base_model = MobileNetV2(
    input_shape=(224, 224, 3),  # Larger input size for better feature extraction
    include_top=False,
    weights='imagenet'
)
base_model.trainable = False  # Initially freeze the base model
```

### 2. Improved Data Augmentation

```python
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
```

### 3. Proper Callbacks

```python
callbacks.EarlyStopping(
    monitor='val_loss',  # CRITICAL change from val_accuracy
    patience=5,
    restore_best_weights=True
)

callbacks.ModelCheckpoint(
    'best_cnn_kidney.keras',
    monitor='val_loss',  # CRITICAL change
    save_best_only=True
)
```

### 4. Fine-tuning

```python
# After initial training
base_model.trainable = True

# Freeze all layers except the last 30
for layer in base_model.layers[:-30]:
    layer.trainable = False
    
# Lower learning rate
optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5)
```

## 🔬 Clinical Recommendations

The model provides confidence-based clinical recommendations:

- **High confidence** (>80%): Strong recommendations
- **Medium confidence** (55-80%): Cautious recommendations
- **Low confidence** (<55%): Suggests additional examinations

## 📊 Evaluation

The model is evaluated on:
- Classification accuracy
- Precision and recall per class
- Confusion matrix
- Loss curves

## 📁 Project Structure

```
kidney_model_improved/
├── final_kidney_model.keras     # Saved model after training
├── best_cnn_kidney.keras        # Best model based on val_loss
├── learning_curves.png          # Training and validation curves
├── confusion_matrix.png         # Confusion matrix visualization
├── classification_report.txt    # Detailed metrics
└── logs/                        # TensorBoard logs
```

## 🔗 References

- [MobileNetV2 Paper](https://arxiv.org/abs/1801.04381)
- [Transfer Learning Best Practices](https://www.tensorflow.org/tutorials/images/transfer_learning)
- [Medical Imaging Analysis with Deep Learning](https://www.nature.com/articles/s41746-019-0158-0)