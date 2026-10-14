"""
AQUORA AI - Machine Learning & Heuristic Risk Evaluation Module
Track 1 Ownership: Project Lead (ML & Integration)

This module provides the baseline risk scoring engine before full model training is completed.
As datasets are curated in data/raw/ and trained via scikit-learn, the trained pipeline
can be persisted and loaded here directly.
"""

from typing import Tuple, List, Optional
import os
from backend.app.schemas.prediction import PredictRequest, PredictResponse

class AquaticRiskPredictor:
    def __init__(self):
        # In this initial scaffold, we explicitly track that the model is in baseline state
        self.version = "baseline-heuristic-v0.1"
        self.is_trained = False

    def predict(self, req: PredictRequest) -> PredictResponse:
        """
        Calculates aquatic hazard score (0 to 100) using hydrodynamic and environmental thresholds.
        NOTE: This is an explainable baseline heuristic pending scikit-learn model training.
        """
        score = 10.0 # base ambient risk
        hazards: List[str] = []
        recommendations: List[str] = []

        # 1. Flow Rate / Velocity Impact (0 to 35 points)
        if req.flow_rate_cms >= 12.0:
            score += 35.0
            hazards.append("Violent Hydrodynamic Current (>12 m³/s)")
            recommendations.append("Extreme current: Absolute water entry ban recommended.")
        elif req.flow_rate_cms >= 6.0:
            score += 24.0
            hazards.append("Rapid Current / High Flow (>6 m³/s)")
            recommendations.append("Fast current: Recreational swimming and paddle-craft strongly discouraged.")
        elif req.flow_rate_cms >= 3.0:
            score += 12.0
            hazards.append("Moderate River Flow (3-6 m³/s)")

        # 2. Water Temperature / Cold Shock Potential (0 to 25 points)
        if req.water_temp_c < 10.0:
            score += 25.0
            hazards.append("Severe Hypothermia & Cold Shock (<10°C)")
            recommendations.append("Immersion without certified thermal drysuit carries rapid hypothermia danger.")
        elif req.water_temp_c < 15.0:
            score += 15.0
            hazards.append("Cold Shock Potential (<15°C)")
            recommendations.append("Water is cold; accidental immersion may cause involuntary gasping reflex.")

        # 3. Rainfall / Flash Flood Potential (0 to 20 points)
        if req.rainfall_last_24h_mm >= 50.0:
            score += 20.0
            hazards.append("Heavy Precipitation Runoff / Flash Flood Warning (>50mm)")
            recommendations.append("Submerged debris and rapidly rising water levels expected.")
        elif req.rainfall_last_24h_mm >= 25.0:
            score += 10.0
            hazards.append("Runoff & Increased Turbidity")

        # 4. Wind Speed & Surface Wave Action (0 to 15 points)
        if req.wind_speed_kmh >= 45.0:
            score += 15.0
            hazards.append("High Gale Winds / Dangerous Wave Surge (>45 km/h)")
            recommendations.append("Capsizing danger for small watercraft; high chop on open waters.")
        elif req.wind_speed_kmh >= 25.0:
            score += 8.0
            hazards.append("Elevated Wind Chop (>25 km/h)")

        # 5. Low Visibility / Depth Complications (0 to 10 points)
        if req.visibility_meters < 800.0:
            score += 10.0
            hazards.append("Poor Surface Visibility (<800m)")
            recommendations.append("Search and rescue capability impaired by low ambient visibility.")

        # Bound score between 0 and 100
        risk_score = round(min(100.0, max(0.0, score)), 1)

        # Categorize risk level
        if risk_score < 30.0:
            risk_level = "low"
            if not recommendations:
                recommendations.append("Standard water safety precautions apply. Enjoy responsibly.")
        elif risk_score < 60.0:
            risk_level = "moderate"
            if not recommendations:
                recommendations.append("Exercise increased awareness; supervise children and inexperienced swimmers.")
        elif risk_score < 80.0:
            risk_level = "high"
            if not recommendations:
                recommendations.append("Swimming prohibited for non-experts; all vessel operators must wear lifejackets.")
        else:
            risk_level = "extreme"
            if not recommendations:
                recommendations.append("Emergency conditions: Total access restriction advised.")

        # Default confidence
        confidence = 0.85

        # Optional Gemini explanation hook
        ai_explanation: Optional[str] = None
        if req.include_ai_explanation:
            ai_explanation = self._generate_ai_explanation(req, risk_score, risk_level, hazards)

        return PredictResponse(
            risk_score=risk_score,
            risk_level=risk_level,
            confidence=confidence,
            primary_hazards=hazards if hazards else ["Nominal baseline conditions"],
            safety_recommendations=recommendations,
            model_version=self.version,
            is_baseline_model=True,
            ai_explanation=ai_explanation
        )

    def _generate_ai_explanation(
        self, req: PredictRequest, score: float, level: str, hazards: List[str]
    ) -> str:
        """Calls Gemini API if GEMINI_API_KEY is available, or returns a structured summary."""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your_gemini_api_key_here":
            return (
                f"Aquora Advisory Summary: Telemetry indicates a {level.upper()} danger level ({score}/100). "
                f"Main contributing factors include: {', '.join(hazards[:2]) if hazards else 'standard ambient factors'}. "
                f"(Configure GEMINI_API_KEY in .env for dynamic generative summaries)."
            )

        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = (
                f"You are AQUORA AI, an expert water safety specialist. Summarize the danger profile "
                f"in 2 concise sentences for a visitor at this water body. Risk score: {score}/100 ({level}). "
                f"Water temp: {req.water_temp_c}°C, flow rate: {req.flow_rate_cms} m³/s, rainfall: {req.rainfall_last_24h_mm} mm. "
                f"Hazards: {', '.join(hazards)}."
            )
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"AI Advisory: {level.capitalize()} hazard score ({score}/100). Caution is recommended due to {', '.join(hazards[:2])}."

# Singleton instance
risk_predictor = AquaticRiskPredictor()
