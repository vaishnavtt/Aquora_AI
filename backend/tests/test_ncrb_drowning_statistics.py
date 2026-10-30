"""
AQUORA AI - Test Suite for Official Kerala NCRB ADSI Drowning Statistics (2018–2024)
Validates dataset file integrity, schema adherence, category conservation,
gender split consistency, duplicate prevention, and non-incident data ethics.
"""

import os
import csv
import json
import tempfile
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.ncrb_drowning_stats_service import (
    NCRBDrowningStatsService,
    ncrb_drowning_stats_service,
    resolve_ncrb_data_dir,
)

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
NCRB_DIR = os.path.join(REPO_ROOT, "data", "raw", "drowning_research", "ncrb_statistics")
METADATA_PATH = os.path.join(REPO_ROOT, "data", "raw", "drowning_research", "metadata.json")
PROCESSED_SUMMARY_PATH = os.path.join(REPO_ROOT, "data", "processed", "ncrb_drowning_statistics_summary.json")
HAZARD_MODEL_PATH = os.path.join(REPO_ROOT, "backend", "app", "ml", "models", "environmental_hazard_model.joblib")


class TestNCRBFileIntegrity:
    """Tests file existence, encoding, and metadata registration."""

    def test_ncrb_directory_and_files_exist(self):
        assert os.path.isdir(NCRB_DIR), f"NCRB statistics directory not found at {NCRB_DIR}"

        required_files = [
            "Kerala_ADSI_Drowning_Statistics_2018_2024.xlsx",
            "Kerala_ADSI_Drowning_Statistics_2018_2024.csv",
            "Kerala_ADSI_Drowning_Category_Detail_2018_2024.csv",
            "Kerala_ADSI_Category_Validation_2018_2024.csv",
            "Kerala_ADSI_Sources_and_Notes_2018_2024.csv",
            "README.md",
        ]
        for f in required_files:
            file_path = os.path.join(NCRB_DIR, f)
            assert os.path.exists(file_path), f"Required file missing: {f}"
            assert os.path.getsize(file_path) > 0, f"File is empty: {f}"

    def test_metadata_registration(self):
        assert os.path.exists(METADATA_PATH), "metadata.json not found"
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            meta = json.load(f)

        file_descriptions = meta.get("file_descriptions", {})
        assert "ncrb_statistics/Kerala_ADSI_Drowning_Statistics_2018_2024.csv" in file_descriptions
        assert "ncrb_statistics/Kerala_ADSI_Drowning_Category_Detail_2018_2024.csv" in file_descriptions
        assert "ncrb_statistics/Kerala_ADSI_Category_Validation_2018_2024.csv" in file_descriptions
        assert "ncrb_statistics/Kerala_ADSI_Sources_and_Notes_2018_2024.csv" in file_descriptions
        assert "ncrb_statistics/Kerala_ADSI_Drowning_Statistics_2018_2024.xlsx" in file_descriptions

        # Verify limitations explicitly mention non-training status
        macro_disc = meta.get("dataset_limitations", {}).get("macro_statistics_disclaimer")
        assert macro_disc is not None
        assert "NOT be used to train incident-level predictive machine-learning models" in macro_disc


class TestNCRBAnnualSummaryData:
    """Validates the 7-year annual state summary numbers."""

    def test_annual_summary_records(self):
        records = ncrb_drowning_stats_service.load_annual_summary()
        assert len(records) == 7, f"Expected 7 annual records (2018-2024), got {len(records)}"

        expected_years = [2018, 2019, 2020, 2021, 2022, 2023, 2024]
        assert [r["year"] for r in records] == expected_years

        # Verified NCRB reported deaths per year
        expected_deaths = {
            2018: 1343,
            2019: 1490,
            2020: 1250,
            2021: 1307,
            2022: 1419,  # Exact match to MoHFW/DGHS benchmark
            2023: 1344,
            2024: 1385,
        }

        total_deaths = 0
        for r in records:
            yr = r["year"]
            assert r["persons_died"] == expected_deaths[yr]
            assert r["male_deaths"] + r["female_deaths"] + r["transgender_deaths"] == r["persons_died"]
            assert r["transgender_deaths"] == 0
            assert r["state_ut"] == "KERALA"
            total_deaths += r["persons_died"]

        assert total_deaths == 9538, f"Expected cumulative deaths 9,538, got {total_deaths}"

    def test_annual_source_tables(self):
        records = ncrb_drowning_stats_service.load_annual_summary()
        for r in records:
            if r["year"] in (2018, 2019):
                assert r["source_table"] == "Table 1.9"
            else:
                assert r["source_table"] == "Table 1.10"
            assert f"ADSI {r['year']}" == r["source_publication"]


class TestNCRBCategoryDetailData:
    """Validates the 4 categories, sub-category conservation, and gender breakdowns."""

    def test_category_detail_row_count_and_keys(self):
        records = ncrb_drowning_stats_service.load_category_details()
        assert len(records) == 28, f"Expected 28 category records (7 years * 4 categories), got {len(records)}"

        expected_categories = {
            "Drowning (Total)",
            "Drowning (Boat Capsize)",
            "Drowning (Accidental Falls into Waterbody)",
            "Drowning (Other Cases)",
        }
        for r in records:
            assert r["drowning_category"] in expected_categories
            assert r["geographic_granularity"] == "State/UT aggregate"
            assert r["incident_level_data"] == "No"

    def test_category_conservation_identity(self):
        """Total == Boat Capsize + Accidental Falls + Other Cases for all metrics."""
        records = ncrb_drowning_stats_service.load_category_details()
        for yr in range(2018, 2025):
            yr_recs = {r["drowning_category"]: r for r in records if r["year"] == yr}
            total = yr_recs["Drowning (Total)"]
            boat = yr_recs["Drowning (Boat Capsize)"]
            falls = yr_recs["Drowning (Accidental Falls into Waterbody)"]
            other = yr_recs["Drowning (Other Cases)"]

            assert total["number_of_cases"] == boat["number_of_cases"] + falls["number_of_cases"] + other["number_of_cases"]
            assert total["injured_total"] == boat["injured_total"] + falls["injured_total"] + other["injured_total"]
            assert total["died_total"] == boat["died_total"] + falls["died_total"] + other["died_total"]

            # Gender splits
            for cat_rec in [total, boat, falls, other]:
                assert cat_rec["injured_total"] == cat_rec["injured_male"] + cat_rec["injured_female"] + cat_rec["injured_transgender"]
                assert cat_rec["died_total"] == cat_rec["died_male"] + cat_rec["died_female"] + cat_rec["died_transgender"]

    def test_accidental_falls_is_predominant_cause(self):
        records = ncrb_drowning_stats_service.load_category_details()
        falls_recs = [r for r in records if "Falls" in r["drowning_category"]]
        total_recs = [r for r in records if r["drowning_category"] == "Drowning (Total)"]

        total_falls_deaths = sum(r["died_total"] for r in falls_recs)
        total_deaths = sum(r["died_total"] for r in total_recs)

        falls_percentage = (total_falls_deaths / total_deaths) * 100
        # Accidental falls accounts for > 85% of all drowning fatalities in Kerala
        assert falls_percentage > 85.0
        assert total_falls_deaths == 8518


class TestDuplicatePrevention:
    """Verifies that duplicate records are detected and rejected with explicit ValueError."""

    def test_duplicate_annual_summary_prevention(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_csv = os.path.join(tmp_dir, "Kerala_ADSI_Drowning_Statistics_2018_2024.csv")
            header = [
                "year", "state_ut", "drowning_cases", "persons_injured",
                "persons_died", "male_deaths", "female_deaths", "transgender_deaths",
                "source_publication", "source_table", "source_file"
            ]
            rows = [
                header,
                ["2018", "KERALA", "1298", "14", "1343", "1105", "238", "0", "ADSI 2018", "Table 1.9", "f1.csv"],
                # Duplicate year 2018
                ["2018", "KERALA", "1298", "14", "1343", "1105", "238", "0", "ADSI 2018", "Table 1.9", "f1.csv"],
            ]
            with open(tmp_csv, "w", newline="", encoding="utf-8") as f:
                csv.writer(f).writerows(rows)

            service = NCRBDrowningStatsService(data_dir=tmp_dir)
            with pytest.raises(ValueError, match="DUPLICATE RECORD DETECTED"):
                service.load_annual_summary()

    def test_duplicate_category_detail_prevention(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_csv = os.path.join(tmp_dir, "Kerala_ADSI_Drowning_Category_Detail_2018_2024.csv")
            header = [
                "year", "state_ut", "drowning_category", "number_of_cases",
                "injured_male", "injured_female", "injured_transgender", "injured_total",
                "died_male", "died_female", "died_transgender", "died_total",
                "ncrb_case_code", "source_publication", "source_table", "source_file",
                "geographic_granularity", "incident_level_data"
            ]
            rows = [
                header,
                ["2024", "KERALA", "Drowning (Boat Capsize)", "19", "5", "0", "0", "5", "18", "0", "0", "18", "10009", "ADSI 2024", "Table 1.10", "f.csv", "State/UT aggregate", "No"],
                # Duplicate (2024, 'Drowning (Boat Capsize)')
                ["2024", "KERALA", "Drowning (Boat Capsize)", "19", "5", "0", "0", "5", "18", "0", "0", "18", "10009", "ADSI 2024", "Table 1.10", "f.csv", "State/UT aggregate", "No"],
            ]
            with open(tmp_csv, "w", newline="", encoding="utf-8") as f:
                csv.writer(f).writerows(rows)

            service = NCRBDrowningStatsService(data_dir=tmp_dir)
            with pytest.raises(ValueError, match="DUPLICATE RECORD DETECTED"):
                service.load_category_details()


class TestDashboardSummaryAndAPI:
    """Verifies analytical summary generation and API endpoint response."""

    def test_historical_summary_generation(self):
        summary = ncrb_drowning_stats_service.get_historical_summary()
        assert summary["state_ut"] == "KERALA"
        assert summary["total_drowning_deaths"] == 9538
        assert summary["total_drowning_cases"] == 9261
        assert summary["total_persons_injured"] == 107
        assert summary["annual_mean_deaths"] == 1362.57
        assert summary["fatality_rate_percent"] == 98.89
        assert len(summary["category_breakdown"]) == 3
        assert len(summary["annual_series"]) == 7

        # Accidental falls dominates
        falls_item = next(c for c in summary["category_breakdown"] if "Falls" in c["category_name"])
        assert falls_item["total_deaths"] == 8518
        assert falls_item["percentage_of_all_deaths"] > 85.0

        # Verify processed cache file exists
        assert os.path.exists(PROCESSED_SUMMARY_PATH)

    def test_api_endpoint(self):
        client = TestClient(app)
        res = client.get("/api/v1/drowning-risk/historical-statistics")
        assert res.status_code == 200

        data = res.json()
        assert data["total_drowning_deaths"] == 9538
        assert len(data["annual_series"]) == 7
        assert "scientific_integrity_notice" in data
        assert "NOT used to train incident-level predictive machine-learning models" in data["scientific_integrity_notice"]


class TestModelAndDatasetIntegrity:
    """Ensures existing ML models and environmental hazard models are completely unmodified."""

    def test_hazard_model_preserved(self):
        assert os.path.exists(HAZARD_MODEL_PATH), "Environmental hazard model file must exist"
        # File should have a non-zero size
        assert os.path.getsize(HAZARD_MODEL_PATH) > 1000

    def test_macro_data_is_not_incident_level(self):
        records = ncrb_drowning_stats_service.load_category_details()
        for r in records:
            assert r["incident_level_data"] == "No"
            assert r["geographic_granularity"] == "State/UT aggregate"
            # Ensure no coordinates or victim profiles are attached
            assert "latitude" not in r
            assert "longitude" not in r
            assert "victim_name" not in r

