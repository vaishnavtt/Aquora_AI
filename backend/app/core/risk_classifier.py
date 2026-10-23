"""
AQUORA AI - Authoritative Risk Classification Engine
Shared classification rule across hydrodynamic, ML, and two-layer drowning-risk pipelines.

Authoritative Risk Scale (0 to 100 calibrated index):
  - NO_PREDICTION: None, NaN, unassessed geographic features, or invalid data
  - LOW:           0.0 <= score < 30.0     (Nominal ambient conditions)
  - MODERATE:      30.0 <= score < 60.0    (Elevated awareness advised)
  - HIGH:          60.0 <= score < 80.0    (Dangerous conditions, swimming prohibited)
  - EXTREME:       80.0 <= score <= 100.0  (Critical emergency conditions)

Scientific and Public Safety Principle:
A LOW risk classification indicates nominal baseline physical conditions.
It is NOT a guarantee of individual swimming safety.
"""

from typing import Optional, Tuple, Union, Dict, Any
import math

# Authoritative threshold constants
THRESHOLD_LOW_UPPER = 30.0
THRESHOLD_MODERATE_UPPER = 60.0
THRESHOLD_HIGH_UPPER = 80.0
MAX_VALID_SCORE = 100.0
MIN_VALID_SCORE = 0.0

# Canonical Category and Level representations
RISK_LEVEL_LOW = "low"
RISK_LEVEL_MODERATE = "moderate"
RISK_LEVEL_HIGH = "high"
RISK_LEVEL_EXTREME = "extreme"
RISK_LEVEL_NO_PREDICTION = "no_prediction"

RISK_CATEGORY_LOW = "LOW"
RISK_CATEGORY_MODERATE = "MODERATE"
RISK_CATEGORY_HIGH = "HIGH"
RISK_CATEGORY_VERY_HIGH = "VERY HIGH"
RISK_CATEGORY_NO_PREDICTION = "NO_PREDICTION"

# Standard UI Color Scheme (aligned with frontend Leaflet/Tailwind standards)
HEX_COLOR_LOW = "#16a34a"          # Emerald green
HEX_COLOR_MEDIUM = "#f59e0b"       # Amber
HEX_COLOR_HIGH = "#dc2626"         # Red
HEX_COLOR_NO_PREDICTION = "#94a3b8" # Slate grey


def is_valid_risk_score(score: Optional[Union[float, int]]) -> bool:
    """Checks if a risk score is a finite number between 0.0 and 100.0."""
    if score is None:
        return False
    try:
        val = float(score)
        return not (math.isnan(val) or math.isinf(val)) and (MIN_VALID_SCORE <= val <= MAX_VALID_SCORE)
    except (ValueError, TypeError):
        return False


def normalize_probability_to_score(prob: Optional[Union[float, int]]) -> Optional[float]:
    """
    Safely scales a model probability in [0.0, 1.0] to a 0-100 risk score.
    Raises ValueError if prob is outside [0.0, 1.0].
    """
    if prob is None:
        return None
    try:
        val = float(prob)
        if math.isnan(val) or math.isinf(val):
            return None
        if val < 0.0 or val > 1.0:
            raise ValueError(f"Probability must be between 0.0 and 1.0, got {val}")
        return round(val * 100.0, 2)
    except (ValueError, TypeError) as e:
        if isinstance(e, ValueError) and "Probability must be between" in str(e):
            raise
        return None


def classify_risk_score(score: Optional[Union[float, int]]) -> Tuple[str, str]:
    """
    Authoritative classification function for all AQUORA AI risk scores (0 to 100).
    
    Returns:
        Tuple[str, str]: (risk_level_lowercase, risk_category_uppercase)
        e.g. ('low', 'LOW'), ('moderate', 'MODERATE'), ('high', 'HIGH'), 
             ('extreme', 'VERY HIGH'), ('no_prediction', 'NO_PREDICTION')
    """
    if not is_valid_risk_score(score):
        return RISK_LEVEL_NO_PREDICTION, RISK_CATEGORY_NO_PREDICTION

    val = round(float(score), 2)

    if val < THRESHOLD_LOW_UPPER:
        return RISK_LEVEL_LOW, RISK_CATEGORY_LOW
    elif val < THRESHOLD_MODERATE_UPPER:
        return RISK_LEVEL_MODERATE, RISK_CATEGORY_MODERATE
    elif val < THRESHOLD_HIGH_UPPER:
        return RISK_LEVEL_HIGH, RISK_CATEGORY_HIGH
    else:
        return RISK_LEVEL_EXTREME, RISK_CATEGORY_VERY_HIGH


def classify_probability(prob: Optional[Union[float, int]]) -> Tuple[Optional[float], str, str]:
    """
    Converts a 0.0-1.0 probability to 0-100 score and classifies it.
    Returns:
        Tuple[score, level, category]
    """
    score = normalize_probability_to_score(prob)
    if score is None:
        return None, RISK_LEVEL_NO_PREDICTION, RISK_CATEGORY_NO_PREDICTION
    level, category = classify_risk_score(score)
    return score, level, category


def normalize_risk_level_str(level: Optional[str]) -> Tuple[str, str]:
    """
    Normalizes arbitrary risk level string representations into canonical level & category.
    """
    if not level:
        return RISK_LEVEL_NO_PREDICTION, RISK_CATEGORY_NO_PREDICTION

    cleaned = level.strip().lower()

    if cleaned in ("low", "safe"):
        return RISK_LEVEL_LOW, RISK_CATEGORY_LOW
    elif cleaned in ("moderate", "medium"):
        return RISK_LEVEL_MODERATE, RISK_CATEGORY_MODERATE
    elif cleaned in ("high", "dangerous"):
        return RISK_LEVEL_HIGH, RISK_CATEGORY_HIGH
    elif cleaned in ("extreme", "very high", "very_high", "critical"):
        return RISK_LEVEL_EXTREME, RISK_CATEGORY_VERY_HIGH
    else:
        return RISK_LEVEL_NO_PREDICTION, RISK_CATEGORY_NO_PREDICTION


def get_risk_classification_rules() -> Dict[str, Any]:
    """
    Returns full authoritative classification rule metadata for the API and frontend clients.
    """
    return {
        "scale": "0 to 100 composite index",
        "thresholds": {
            "low": {"min": 0.0, "max_exclusive": THRESHOLD_LOW_UPPER, "label": "LOW RISK", "hex": HEX_COLOR_LOW},
            "moderate": {"min": THRESHOLD_LOW_UPPER, "max_exclusive": THRESHOLD_MODERATE_UPPER, "label": "MEDIUM RISK", "hex": HEX_COLOR_MEDIUM},
            "high": {"min": THRESHOLD_MODERATE_UPPER, "max_exclusive": THRESHOLD_HIGH_UPPER, "label": "HIGH RISK", "hex": HEX_COLOR_HIGH},
            "extreme": {"min": THRESHOLD_HIGH_UPPER, "max_inclusive": MAX_VALID_SCORE, "label": "VERY HIGH RISK", "hex": HEX_COLOR_HIGH},
            "no_prediction": {"min": None, "max": None, "label": "NO PREDICTION AVAILABLE", "hex": HEX_COLOR_NO_PREDICTION},
        },
        "scientific_disclaimer": (
            "A LOW risk classification indicates nominal baseline physical conditions. "
            "It is NOT a safety guarantee. Swimming or entering rivers and quarries carries inherent danger."
        )
    }
