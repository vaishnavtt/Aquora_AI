"""
AQUORA AI - Environmental Safety Reporting & Analytics Routes
Track: Reporting, Analytics & Decision Support Dossiers

Endpoints:
- GET /api/v1/reports/hazard-assessment/{water_body_id}      : Printable HTML / PDF Executive Hazard Dossier
- GET /api/v1/reports/hazard-assessment/{water_body_id}/json : Structured JSON assessment payload
- GET /api/v1/reports/district-summary                      : Aggregate Kerala 14-district risk summary
- GET /api/v1/reports/model-benchmarks                      : ML forecasting and classification benchmarks
"""

from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from sqlalchemy.orm import Session

try:
    from app.db.session import get_db
    from app.services.reporting_service import reporting_service
except ImportError:
    from backend.app.db.session import get_db
    from backend.app.services.reporting_service import reporting_service

router = APIRouter(prefix="/reports", tags=["Reporting & Analytics Dossiers"])


@router.get(
    "/hazard-assessment/{water_body_id}",
    summary="Get Printable Hazard Assessment Dossier (HTML / Print-to-PDF)",
    description="Returns an executive, print-optimized safety assessment report complete with sign-off blocks and risk breakdowns.",
)
def get_hazard_assessment_report_html(
    water_body_id: int = Path(..., ge=1, description="Unique water body identifier"),
    db: Session = Depends(get_db),
):
    try:
        data = reporting_service.get_hazard_assessment_report_data(db, water_body_id)
        html_content = reporting_service.render_hazard_assessment_html(data)
        return Response(content=html_content, media_type="text/html")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Report generation error: {str(e)}")


@router.get(
    "/hazard-assessment/{water_body_id}/json",
    summary="Get Structured Hazard Assessment Report (JSON)",
    description="Returns full structured data for the hazard assessment report suitable for downstream integration.",
)
def get_hazard_assessment_report_json(
    water_body_id: int = Path(..., ge=1, description="Unique water body identifier"),
    db: Session = Depends(get_db),
):
    try:
        return reporting_service.get_hazard_assessment_report_data(db, water_body_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/district-summary",
    summary="District-Wise Water Hazard Summary",
    description="Aggregates site counts, high-risk locations, and inspection workloads across all 14 Kerala districts.",
)
def get_district_summary(db: Session = Depends(get_db)):
    return reporting_service.get_district_summary_report(db)


@router.get(
    "/model-benchmarks",
    summary="Machine Learning Model Performance Report",
    description="Returns empirical benchmark metrics (MAE, RMSE, R², ROC-AUC, Brier score) for forecasting and hazard classifiers.",
)
def get_model_benchmarks():
    return reporting_service.get_model_benchmarks_report()

