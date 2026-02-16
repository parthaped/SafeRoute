"""
Train XGBoost model to predict crime risk per grid cell/time.
Usage: python scripts/train_model.py
Requires: xgboost, scikit-learn (pip install xgboost scikit-learn)
"""
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import pickle
import json
import os

def predict_risk(model, feature_cols, grid, hour: int, day_of_week: int) -> pd.DataFrame:
    """Predict risk scores for all cells at a given hour/day_of_week."""
    features = grid.copy()
    features['hour'] = hour
    features['day_of_week'] = day_of_week
    features['is_weekend'] = day_of_week in [5, 6]
    features['is_late_night'] = hour >= 22 or hour < 6
    features['hour_sin'] = np.sin(2 * np.pi * hour / 24)
    features['hour_cos'] = np.cos(2 * np.pi * hour / 24)
    features['dow_sin'] = np.sin(2 * np.pi * day_of_week / 7)
    features['dow_cos'] = np.cos(2 * np.pi * day_of_week / 7)
    
    for col in feature_cols:
        if col not in features.columns:
            features[col] = 0
    
    X = features[feature_cols].fillna(0)
    predictions = model.predict(X)
    
    result = features[['cell_id', 'lat_center', 'lon_center']].copy()
    result['risk_score'] = predictions
    
    return result

def train_risk_model(df_training: pd.DataFrame, output_dir: str = 'models'):
    """Train XGBoost model to predict incident count."""
    os.makedirs(output_dir, exist_ok=True)
    
    exclude_cols = ['cell_id', 'incident_count', 'lat_min', 'lat_max', 'lon_min', 'lon_max']
    feature_cols = [col for col in df_training.columns if col not in exclude_cols]
    
    X = df_training[feature_cols]
    y = df_training['incident_count']
    
    X = X.fillna(0)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    model = xgb.XGBRegressor(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        objective='reg:squarederror'
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        early_stopping_rounds=10,
        verbose=False
    )
    
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)
    
    mae_train = mean_absolute_error(y_train, y_pred_train)
    mae_test = mean_absolute_error(y_test, y_pred_test)
    rmse_test = np.sqrt(mean_squared_error(y_test, y_pred_test))
    
    print(f"Training MAE: {mae_train:.3f}")
    print(f"Test MAE: {mae_test:.3f}")
    print(f"Test RMSE: {rmse_test:.3f}")
    
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nTop 10 features:")
    print(feature_importance.head(10))
    
    model_path = f'{output_dir}/crime_risk_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    with open(f'{output_dir}/feature_columns.json', 'w') as f:
        json.dump(feature_cols, f)
    
    grid = df_training[['cell_id', 'lat_center', 'lon_center', 'lat_min', 'lat_max', 'lon_min', 'lon_max']].drop_duplicates()
    grid.to_csv(f'{output_dir}/grid_cells.csv', index=False)
    
    print(f"\nModel saved to {model_path}")
    
    return model, feature_cols

if __name__ == '__main__':
    import sys
    
    input_file = sys.argv[1] if len(sys.argv) > 1 else 'training_data.csv'
    
    df_training = pd.read_csv(input_file)
    
    model, feature_cols = train_risk_model(df_training)
    
    # Example prediction
    grid = pd.read_csv('models/grid_cells.csv')
    risk_map = predict_risk(model, feature_cols, grid, hour=23, day_of_week=4)
    
    threshold = risk_map['risk_score'].quantile(0.75)
    high_risk = risk_map[risk_map['risk_score'] >= threshold]
    
    print(f"\nHigh-risk cells (Friday 11 PM, threshold={threshold:.2f}): {len(high_risk)}")
    high_risk.to_csv('high_risk_cells_friday_11pm.csv', index=False)
