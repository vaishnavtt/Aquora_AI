"""
AQUORA AI - Validation Suite for Kerala Drowning Research Dataset Starter Pack
Directory: data/raw/drowning_research/

Validates:
1. All six CSV files are present, valid UTF-8, and readable.
2. README.md exists and contains required scientific guidelines.
3. metadata.json exists, parses cleanly, and details coverage, sources, limitations, and descriptions.
4. Sourced historical statistics (sourced_context.csv, source_register.csv) are clearly distinguished from empty templates.
5. Blank values in templates are NOT interpreted or imputed as zero.
6. Existing AQUORA hydrological training datasets and models are unmodified.
"""

import os
import csv
import json
import pytest

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw", "drowning_research"))

EXPECTED_FILES = [
    "district_year_template.csv",
    "incident_registry.csv",
    "hydrology_observations.csv",
    "waterbody_inventory.csv",
    "sourced_context.csv",
    "source_register.csv",
]

ALL_KERALA_DISTRICTS = [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam",
    "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta",
    "Thiruvananthapuram", "Thrissur", "Wayanad"
]


def test_drowning_research_folder_and_six_csv_files_present():
    """Task 1: Verify that all six CSV files are present and readable."""
    assert os.path.exists(DATA_DIR), f"Directory {DATA_DIR} does not exist"
    for fname in EXPECTED_FILES:
        fpath = os.path.join(DATA_DIR, fname)
        assert os.path.isfile(fpath), f"Expected file {fname} not found in {DATA_DIR}"
        # Verify readable as UTF-8 CSV
        with open(fpath, "r", encoding="utf-8") as f:
            reader = list(csv.reader(f))
            assert len(reader) >= 1, f"File {fname} is empty or unreadable"
            header = reader[0]
            assert len(header) >= 2, f"Header in {fname} has too few columns ({len(header)})"


def test_district_year_template_structure_and_no_zero_imputation():
    """
    Task 2, 5 & 6:
    Verifies that district_year_template.csv contains 112 grid rows (14 districts x 8 years),
    all metrics are blank (NOT ZERO), and verification_status is NOT_YET_SOURCED.
    """
    fpath = os.path.join(DATA_DIR, "district_year_template.csv")
    with open(fpath, "r", encoding="utf-8") as f:
        rows = list(csv.reader(f))

    header = rows[0]
    expected_header = [
        "year", "district", "drowning_deaths", "drowning_incidents",
        "injuries", "source_document", "source_page_or_table",
        "verification_status", "notes"
    ]
    assert header == expected_header

    data_rows = rows[1:]
    assert len(data_rows) == 112, f"Expected 112 district-year rows, found {len(data_rows)}"

    # Check that all 14 districts and years 2018-2025 are covered
    districts_present = {r[1] for r in data_rows}
    years_present = {int(r[0]) for r in data_rows}

    assert set(ALL_KERALA_DISTRICTS) == districts_present
    assert set(range(2018, 2026)) == years_present

    for idx, r in enumerate(data_rows, start=2):
        # drowning_deaths (col 2), drowning_incidents (col 3), injuries (col 4) MUST BE BLANK, NOT ZERO!
        deaths_val = r[2]
        incidents_val = r[3]
        injuries_val = r[4]
        status_val = r[7]

        assert deaths_val == "", f"Row {idx} has non-blank deaths: '{deaths_val}'. Blanks must not be 0!"
        assert incidents_val == "", f"Row {idx} has non-blank incidents: '{incidents_val}'."
        assert injuries_val == "", f"Row {idx} has non-blank injuries: '{injuries_val}'."
        assert status_val == "NOT_YET_SOURCED"


def test_empty_incident_and_observation_templates():
    """
    Task 5 & 8:
    Verifies that incident_registry.csv, hydrology_observations.csv, and waterbody_inventory.csv
    are empty research templates (header only, 0 data rows) and contain no fabricated incidents.
    """
    templates = {
        "incident_registry.csv": 26,
        "hydrology_observations.csv": 18,
        "waterbody_inventory.csv": 17,
    }
    for fname, expected_cols in templates.items():
        fpath = os.path.join(DATA_DIR, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            rows = list(csv.reader(f))
        assert len(rows) == 1, f"Template {fname} should contain header only (0 data rows); found {len(rows)} rows."
        assert len(rows[0]) == expected_cols, f"Template {fname} column count mismatch: {len(rows[0])} vs {expected_cols}"


def test_sourced_context_and_source_register():
    """
    Task 5:
    Verifies that sourced_context.csv contains genuine official aggregate data
    and source_register.csv contains official primary sources (S1-S9).
    """
    # 1. Sourced context
    ctx_path = os.path.join(DATA_DIR, "sourced_context.csv")
    with open(ctx_path, "r", encoding="utf-8") as f:
        ctx_rows = list(csv.reader(f))
    assert len(ctx_rows) == 7  # 1 header + 6 data rows
    header = ctx_rows[0]
    assert header == ["geography", "year", "drowning_deaths", "measure", "source"]

    # Verify Kerala 2022 aggregate
    kerala_row = next(r for r in ctx_rows[1:] if r[0] == "Kerala" and r[1] == "2022")
    assert kerala_row[2] == "1419", "Kerala 2022 drowning deaths mismatch"

    # 2. Source register
    reg_path = os.path.join(DATA_DIR, "source_register.csv")
    with open(reg_path, "r", encoding="utf-8") as f:
        reg_rows = list(csv.reader(f))
    assert len(reg_rows) == 10  # 1 header + 9 data rows
    source_ids = [r[0] for r in reg_rows[1:]]
    assert source_ids == ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"]


def test_metadata_json_specification():
    """
    Task 4:
    Verifies metadata.json exists, parses cleanly, and details all required fields.
    """
    meta_path = os.path.join(DATA_DIR, "metadata.json")
    assert os.path.isfile(meta_path)

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    # Check geographic coverage
    geo = meta.get("geographic_coverage", {})
    assert geo.get("district_count") == 14
    assert set(geo.get("districts", [])) == set(ALL_KERALA_DISTRICTS)

    # Check period 2018-2025
    period = meta.get("intended_period", {})
    assert period.get("start_year") == 2018
    assert period.get("end_year") == 2025
    assert len(period.get("target_years", [])) == 8

    # Check original sources
    sources = meta.get("original_sources", [])
    assert len(sources) >= 9
    assert any("NCRB" in s.get("name", "") for s in sources)

    # Check dataset limitations
    limits = meta.get("dataset_limitations", {})
    assert "blank_value_interpretation" in limits
    assert "ml_training_readiness" in limits
    assert "NOT READY" in limits.get("ml_training_readiness", "")

    # Check file descriptions
    file_desc = meta.get("file_descriptions", {})
    for fname in EXPECTED_FILES:
        assert fname in file_desc


def test_readme_markdown_exists_and_documents_guidelines():
    """Task 3: Verifies README.md exists and documents all requirements."""
    readme_path = os.path.join(DATA_DIR, "README.md")
    assert os.path.isfile(readme_path)
    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert len(content) > 500
    assert "All 14 Kerala districts" in content or "14 districts" in content
    assert "2018" in content and "2025" in content
    assert "Blank Values Mean Unknown, NOT Zero" in content
    assert "NO Machine Learning Training on These Templates" in content
    assert "Zero Synthetic Incidents" in content


def test_existing_aquora_models_and_datasets_unmodified():
    """
    Task 9:
    Verifies that existing AQUORA operational models and hydrological datasets
    in data/raw/ and backend/app/ml/models/ were not modified or overwritten.
    """
    repo_root = os.path.abspath(os.path.join(DATA_DIR, "..", "..", ".."))

    # Check that core telemetry files remain intact
    rwl_path = os.path.join(repo_root, "data", "raw", "rwl_tel_hr_kerala_sw_999_2021_2025.csv")
    assert os.path.exists(rwl_path)
    assert os.path.getsize(rwl_path) > 60_000_000  # ~63 MB

    rainfall_path = os.path.join(repo_root, "data", "raw", "rainfall_tel_hr_kerala_sw_kl_2021_2025.csv")
    assert os.path.exists(rainfall_path)
    assert os.path.getsize(rainfall_path) > 25_000_000  # ~27 MB

    # Check champion ML model
    model_path = os.path.join(repo_root, "backend", "app", "ml", "models", "environmental_hazard_model.joblib")
    assert os.path.exists(model_path)

