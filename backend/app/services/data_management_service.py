"""
AQUORA AI - Data Management, Export, Import & Database Backup Service
Track: Data Management, Quality Assurance & Audit Trails

Features:
- Export monitored water bodies as standard RFC 4180 CSV
- Export safety inspection ledgers as CSV
- Validated CSV import with duplicate prevention and Kerala geospatial bounds checking
- Atomic database snapshot generation for disaster recovery backup
"""

import csv
import io
import os
import shutil
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

try:
    from app.core.config import settings
    from app.models.water_body import WaterBodyModel
    from app.models.inspection import InspectionRecordModel
    from app.core.risk_classifier import classify_risk_score
except ImportError:
    from backend.app.core.config import settings
    from backend.app.models.water_body import WaterBodyModel
    from backend.app.models.inspection import InspectionRecordModel
    from backend.app.core.risk_classifier import classify_risk_score

# Kerala geographic bounding box
KERALA_LAT_MIN = 8.0
KERALA_LAT_MAX = 13.0
KERALA_LON_MIN = 74.5
KERALA_LON_MAX = 77.8

VALID_WATER_TYPES = {"river", "lake", "reservoir", "coastal", "quarry", "waterfall", "canal"}


class DataManagementService:
    """Service handling dataset exports, imports, integrity verification, and database backups."""

    def export_water_bodies_csv(self, db: Session) -> str:
        """Exports all monitored water bodies to CSV format."""
        output = io.StringIO()
        writer = csv.writer(output, lineterminator="\n")

        headers = [
            "id",
            "name",
            "type",
            "latitude",
            "longitude",
            "current_risk_level",
            "risk_score",
            "water_temp_c",
            "flow_rate_cms",
            "depth_meters",
            "elevation_meters",
            "basin_region",
            "data_source",
            "description",
            "last_updated",
            "is_demonstration_data",
        ]
        writer.writerow(headers)

        water_bodies = db.query(WaterBodyModel).order_by(WaterBodyModel.id).all()
        for wb in water_bodies:
            level, _ = classify_risk_score(wb.risk_score)
            writer.writerow([
                wb.id,
                wb.name,
                wb.type,
                f"{wb.latitude:.6f}",
                f"{wb.longitude:.6f}",
                level,
                f"{wb.risk_score:.1f}" if wb.risk_score is not None else "",
                f"{wb.water_temp_c:.1f}" if wb.water_temp_c is not None else "",
                f"{wb.flow_rate_cms:.2f}" if wb.flow_rate_cms is not None else "",
                f"{wb.depth_meters:.2f}" if wb.depth_meters is not None else "",
                f"{wb.elevation_meters:.1f}" if wb.elevation_meters is not None else "",
                wb.basin_region or "",
                wb.data_source or "",
                wb.description or "",
                wb.last_updated.isoformat() if wb.last_updated else "",
                1 if wb.is_demonstration_data else 0,
            ])

        return output.getvalue()

    def export_inspections_csv(self, db: Session) -> str:
        """Exports all recorded safety inspections to CSV format."""
        output = io.StringIO()
        writer = csv.writer(output, lineterminator="\n")

        headers = [
            "id",
            "water_body_id",
            "water_body_name",
            "water_body_type",
            "district",
            "priority_tier",
            "priority_rank_score",
            "scheduled_date",
            "completed_date",
            "status",
            "inspector_name",
            "environmental_hazard_score",
            "composite_risk_score",
            "action_required",
            "findings_notes",
            "created_at",
            "updated_at",
        ]
        writer.writerow(headers)

        inspections = db.query(InspectionRecordModel).order_by(InspectionRecordModel.id).all()
        for ins in inspections:
            writer.writerow([
                ins.id,
                ins.water_body_id,
                ins.water_body_name,
                ins.water_body_type or "",
                ins.district or "",
                ins.priority_tier,
                f"{ins.priority_rank_score:.1f}" if ins.priority_rank_score is not None else "",
                ins.scheduled_date.isoformat() if ins.scheduled_date else "",
                ins.completed_date.isoformat() if ins.completed_date else "",
                ins.status,
                ins.inspector_name or "",
                f"{ins.environmental_hazard_score:.1f}" if ins.environmental_hazard_score is not None else "",
                f"{ins.composite_risk_score:.1f}" if ins.composite_risk_score is not None else "",
                1 if ins.action_required else 0,
                ins.findings_notes or "",
                ins.created_at.isoformat() if ins.created_at else "",
                ins.updated_at.isoformat() if ins.updated_at else "",
            ])

        return output.getvalue()

    def import_water_bodies_csv(self, db: Session, csv_content: str) -> Dict[str, Any]:
        """
        Imports and validates water bodies from CSV data.
        Performs:
        - Required header detection
        - Row-level type & coordinate range validation
        - Duplicate detection based on name and proximity (< 0.002 deg / ~220m)
        - Kerala state geographic bounding verification
        """
        reader = csv.DictReader(io.StringIO(csv_content))
        if not reader.fieldnames:
            return {"success": False, "error": "Empty or invalid CSV file."}

        required_cols = {"name", "type", "latitude", "longitude"}
        present_cols = {f.strip().lower() for f in reader.fieldnames if f}
        missing_cols = required_cols - present_cols
        if missing_cols:
            return {
                "success": False,
                "error": f"CSV missing mandatory columns: {list(missing_cols)}",
            }

        existing_sites = db.query(WaterBodyModel).all()
        existing_names = {s.name.lower().strip() for s in existing_sites}
        existing_coords = [(s.latitude, s.longitude) for s in existing_sites]

        imported_count = 0
        skipped_duplicates = 0
        errors = []
        new_records = []
        now = datetime.now(timezone.utc)

        for row_num, row in enumerate(reader, start=2):
            try:
                # Case-insensitive column lookup
                normalized = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items() if k}
                name = normalized.get("name", "").strip()
                wb_type = normalized.get("type", "").lower().strip()
                lat_str = normalized.get("latitude", "")
                lon_str = normalized.get("longitude", "")

                if not name:
                    errors.append(f"Row {row_num}: Water body name cannot be blank.")
                    continue

                if wb_type not in VALID_WATER_TYPES:
                    errors.append(f"Row {row_num} ('{name}'): Invalid aquatic type '{wb_type}'. Must be one of {sorted(list(VALID_WATER_TYPES))}.")
                    continue

                try:
                    lat = float(lat_str)
                    lon = float(lon_str)
                except ValueError:
                    errors.append(f"Row {row_num} ('{name}'): Invalid numeric coordinates ({lat_str}, {lon_str}).")
                    continue

                if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                    errors.append(f"Row {row_num} ('{name}'): Coordinates out of planetary bounds ({lat}, {lon}).")
                    continue

                # Duplicate detection: exact name match
                if name.lower() in existing_names:
                    skipped_duplicates += 1
                    continue

                # Duplicate detection: proximity match (< 0.002 deg ~ 220m)
                is_proximate_dup = False
                for ex_lat, ex_lon in existing_coords:
                    if abs(ex_lat - lat) < 0.002 and abs(ex_lon - lon) < 0.002:
                        is_proximate_dup = True
                        break
                if is_proximate_dup:
                    skipped_duplicates += 1
                    continue

                # Kerala bounds notice (flagged as non-blocking warning / tagged)
                in_kerala = (KERALA_LAT_MIN <= lat <= KERALA_LAT_MAX and KERALA_LON_MIN <= lon <= KERALA_LON_MAX)
                basin = normalized.get("basin_region", "")
                if not basin and in_kerala:
                    basin = "Kerala Water Basin"

                # Numeric optional fields
                def parse_float(val: str, default: Optional[float] = None) -> Optional[float]:
                    try:
                        return float(val) if val else default
                    except ValueError:
                        return default

                risk_score = parse_float(normalized.get("risk_score"), 20.0)
                water_temp = parse_float(normalized.get("water_temp_c"), 25.0)
                flow_rate = parse_float(normalized.get("flow_rate_cms"), 1.0)
                depth = parse_float(normalized.get("depth_meters"), 3.0)
                elevation = parse_float(normalized.get("elevation_meters"), 15.0)

                level, _ = classify_risk_score(risk_score)

                wb = WaterBodyModel(
                    name=name,
                    type=wb_type,
                    latitude=lat,
                    longitude=lon,
                    current_risk_level=level,
                    risk_score=risk_score,
                    water_temp_c=water_temp,
                    flow_rate_cms=flow_rate,
                    depth_meters=depth,
                    elevation_meters=elevation,
                    basin_region=basin or "Imported Regional Basin",
                    data_source=normalized.get("data_source") or "CSV Authority Ingestion",
                    description=normalized.get("description") or f"Ingested monitored site. Within Kerala bounds: {in_kerala}.",
                    last_updated=now,
                    is_demonstration_data=False,
                )

                new_records.append(wb)
                existing_names.add(name.lower())
                existing_coords.append((lat, lon))
                imported_count += 1

            except Exception as e:
                errors.append(f"Row {row_num}: Processing error: {str(e)}")

        if new_records:
            db.add_all(new_records)
            db.commit()

        return {
            "success": True,
            "imported_count": imported_count,
            "skipped_duplicates_count": skipped_duplicates,
            "errors": errors,
            "total_processed": imported_count + skipped_duplicates + len(errors),
        }

    def get_database_backup_bytes(self) -> bytes:
        """
        Reads the SQLite database file and returns a binary snapshot for backup/disaster recovery.
        """
        db_url = settings.DATABASE_URL
        if "sqlite:///" in db_url:
            db_path = db_url.replace("sqlite:///", "")
            if not os.path.isabs(db_path):
                backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
                db_path = os.path.join(backend_dir, db_path)
            
            if os.path.exists(db_path):
                # Copy to temp file to ensure atomic read without write locks
                with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
                    tmp_path = tmp.name
                shutil.copy2(db_path, tmp_path)
                with open(tmp_path, "rb") as f:
                    data = f.read()
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
                return data

        raise FileNotFoundError("Active SQLite database file could not be located for backup.")


data_management_service = DataManagementService()
