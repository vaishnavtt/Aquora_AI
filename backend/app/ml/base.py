"""
AQUORA AI - Machine Learning Predictor Service Interface
Track 1 Ownership: Project Lead (ML & Integration)

This module defines the abstract contract (BaseRiskPredictor) that any prediction
engine must satisfy. The ML Lead can implement a subclass (e.g. MLModelPredictor)
and register it with the PredictionService without requiring any changes to the
FastAPI routing or controller layers.
"""

from abc import ABC, abstractmethod
try:
    from app.schemas.prediction import PredictRequest, PredictResponse
except ImportError:
    from backend.app.schemas.prediction import PredictRequest, PredictResponse

class BaseRiskPredictor(ABC):
    """
    Abstract Base Class for all aquatic hazard prediction engines.
    """

    @property
    @abstractmethod
    def version(self) -> str:
        """Returns the unique version identifier of the predictor engine."""
        pass

    @property
    @abstractmethod
    def is_trained(self) -> bool:
        """Returns True if a trained ML pipeline is active; False if heuristic/untrained."""
        pass

    @abstractmethod
    def predict(self, req: PredictRequest) -> PredictResponse:
        """
        Executes hydrodynamic hazard risk scoring against incoming telemetry data.
        
        Args:
            req (PredictRequest): Validated environmental and hydrodynamic indicators.

        Returns:
            PredictResponse: Risk score (0-100), categorization, hazards, and recommendations.
        """
        pass
