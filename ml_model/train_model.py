import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import MultiLabelBinarizer, StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

def clean_and_split_symptoms(symptoms_str):
    if not isinstance(symptoms_str, str) or not symptoms_str.strip():
        return []
    return [s.strip().lower() for s in symptoms_str.split(',') if s.strip()]

def main():
    base_dir = r"c:\Users\senth\Videos\TqPdd"
    data_path = os.path.join(base_dir, "behavioral_health_dataset_v5.csv")
    model_dir = os.path.join(base_dir, "ml_model")
    model_path = os.path.join(model_dir, "rf_disease_pipeline.joblib")

    print(f"Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)
    print(f"Dataset shape: {df.shape}")

    # Feature definitions
    num_features = ['Sleep_Time_Hours', 'Steps_Per_Day', 'Calories_Consumed_kcal', 'Water_Intake_Liters']
    target_col = 'Disease_Diagnosis'

    # Drop missing target or symptoms
    df = df.dropna(subset=[target_col, 'Symptoms'] + num_features)
    print(f"Cleaned dataset shape: {df.shape}")

    # 1. Symptom processing with MultiLabelBinarizer
    symptoms_series = df['Symptoms'].apply(clean_and_split_symptoms)
    mlb = MultiLabelBinarizer()
    symptoms_encoded = mlb.fit_transform(symptoms_series)
    vocab = list(mlb.classes_)
    print(f"Discovered {len(vocab)} unique symptom tokens in training set:")
    print(vocab)

    # 2. Behavioral features scaling with StandardScaler
    scaler = StandardScaler()
    behavior_scaled = scaler.fit_transform(df[num_features].values)

    # 3. Concatenate joint feature representation
    X_joint = np.hstack([symptoms_encoded, behavior_scaled])
    print(f"Joint feature matrix shape: {X_joint.shape}")

    # Encode Target Labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(df[target_col].values)
    class_names = list(label_encoder.classes_)
    print(f"Classes ({len(class_names)}): {class_names}")

    # 4. Stratified 80/20 Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X_joint, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    # Train RandomForestClassifier (n_estimators=300, max_depth=12, class_weight="balanced")
    rf_clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )

    # 5-Fold Stratified Cross-Validation on training set
    print("\nEvaluating 5-Fold Stratified Cross-Validation on training data...")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(rf_clf, X_train, y_train, cv=skf, scoring='accuracy', n_jobs=-1)
    print(f"5-Fold CV Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    # Fit final model on full training set
    print("\nTraining RandomForestClassifier on 80% train split...")
    rf_clf.fit(X_train, y_train)

    # 5. Evaluate on 20% Test set
    y_pred = rf_clf.predict(X_test)
    test_acc = accuracy_score(y_test, y_pred)

    print("\n" + "="*60)
    print(f"TEST SET ACCURACY: {test_acc:.4f}")
    print("="*60)
    print("\nPER-CLASS CLASSIFICATION REPORT:")
    print(classification_report(y_test, y_pred, target_names=class_names, digits=4))

    print("\nCONFUSION MATRIX:")
    cm = confusion_matrix(y_test, y_pred)
    cm_df = pd.DataFrame(cm, index=class_names, columns=class_names)
    print(cm_df)
    print("="*60)

    # 6. Persist artifacts with joblib
    os.makedirs(model_dir, exist_ok=True)
    artifacts = {
        'model': rf_clf,
        'symptom_binarizer': mlb,
        'scaler': scaler,
        'label_encoder': label_encoder,
        'num_features': num_features,
        'classes': class_names,
        'vocab': vocab
    }
    
    joblib.dump(artifacts, model_path)
    print(f"\nModel and preprocessors successfully persisted to:\n  {model_path}")

if __name__ == "__main__":
    main()
