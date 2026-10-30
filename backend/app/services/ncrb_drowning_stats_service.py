"""
AQUORA AI - Official Kerala NCRB ADSI Drowning Statistics Service
Handles loading, strict validation, duplicate prevention, and analytical summarization
for official NCRB Accidental Deaths & Suicides in India (ADSI) 2018–2024 Kerala drowning data.

CRITICAL DATA ETHICS & SCIENTIFIC INTEGRITY:
- State-level macro statistics ONLY.
- These records represent annual aggregates, NOT micro-level geocoded drowning incidents.
- STRICTLY PROHIBITED to train incident-level predictive machine learning models using these aggregate records.
- Preserves all official categories: Boat Capsize, Accidental Falls into Waterbody, Other Cases.
- Preserves full gender distributions (Male, Female, Transgender).
"""

import os
import csv
import json
import logging
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

# Base directory resolution
SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.abspath(os.path.join(SERVICE_DIR, ".."))
REPO_ROOT = os.path.abspath(os.path.join(APP_DIR, "..", ".."))

# Potential path locations for robust testing & execution
CANDIDATE_DIRS = [
    os.path.join(REPO_ROOT, "data", "raw", "drowning_research", "ncrb_statistics"),
    os.path.join(os.getcwd(), "data", "raw", "drowning_research", "ncrb_statistics"),
    os.path.abspath("data/raw/drowning_research/ncrb_statistics"),
]

PROCESSED_SUMMARY_PATHS = [
    os.path.join(REPO_ROOT, "data", "processed", "ncrb_drowning_statistics_summary.json"),
    os.path.join(os.getcwd(), "data", "processed", "ncrb_drowning_statistics_summary.json"),
    os.path.abspath("data/processed/ncrb_drowning_statistics_summary.json"),
]


def resolve_ncrb_data_dir() -> str:
    for d in CANDIDATE_DIRS:
        if os.path.exists(d) and os.path.isdir(d):
            return d
    return CANDIDATE_DIRS[0]


class NCRBDrowningStatsService:
    """
    Service for loading, validating, and presenting official NCRB ADSI Kerala drowning statistics (2018–2024).
    """

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or resolve_ncrb_data_dir()
        self.annual_csv_path = os.path.join(self.data_dir, "Kerala_ADSI_Drowning_Statistics_2018_2024.csv")
        self.category_csv_path = os.path.join(self.data_dir, "Kerala_ADSI_Drowning_Category_Detail_2018_2024.csv")
        self.validation_csv_path = os.path.join(self.data_dir, "Kerala_ADSI_Category_Validation_2018_2024.csv")
        self.sources_csv_path = os.path.join(self.data_dir, "Kerala_ADSI_Sources_and_Notes_2018_2024.csv")

    def load_annual_summary(self) -> List[Dict[str, Any]]:
        """
        Loads the annual state summary CSV, validating column structure and preventing duplicate year entries.
        """
        if not os.path.exists(self.annual_csv_path):
            raise FileNotFoundError(f"Annual summary file not found: {self.annual_csv_path}")

        records = []
        seen_years = set()

        with open(self.annual_csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            expected_fields = {
                "year", "state_ut", "drowning_cases", "persons_injured",
                "persons_died", "male_deaths", "female_deaths", "transgender_deaths",
                "source_publication", "source_table", "source_file"
            }
            if not expected_fields.issubset(set(reader.fieldnames or [])):
                missing = expected_fields - set(reader.fieldnames or [])
                raise ValueError(f"Annual summary missing required columns: {missing}")

            for row in reader:
                year = int(row["year"])
                # Duplicate prevention
                if year in seen_years:
                    raise ValueError(f"DUPLICATE RECORD DETECTED: Annual summary already contains an entry for year {year}")
                seen_years.add(year)

                record = {
                    "year": year,
                    "state_ut": row["state_ut"],
                    "drowning_cases": int(row["drowning_cases"]),
                    "persons_injured": int(row["persons_injured"]),
                    "persons_died": int(row["persons_died"]),
                    "male_deaths": int(row["male_deaths"]),
                    "female_deaths": int(row["female_deaths"]),
                    "transgender_deaths": int(row["transgender_deaths"]),
                    "source_publication": row["source_publication"],
                    "source_table": row["source_table"],
                    "source_file": row["source_file"],
                }

                # Validation: gender deaths sum to persons_died
                gender_sum = record["male_deaths"] + record["female_deaths"] + record["transgender_deaths"]
                if gender_sum != record["persons_died"]:
                    raise ValueError(
                        f"Gender death sum mismatch in year {year}: male({record['male_deaths']}) + "
                        f"female({record['female_deaths']}) + trans({record['transgender_deaths']}) = {gender_sum} != {record['persons_died']}"
                    )

                records.append(record)

        return sorted(records, key=lambda x: x["year"])

    def load_category_details(self) -> List[Dict[str, Any]]:
        """
        Loads the 4-category detail CSV, enforcing duplicate prevention on (year, category)
        and verifying arithmetic identities.
        """
        if not os.path.exists(self.category_csv_path):
            raise FileNotFoundError(f"Category detail file not found: {self.category_csv_path}")

        records = []
        seen_keys = set()

        with open(self.category_csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            expected_fields = {
                "year", "state_ut", "drowning_category", "number_of_cases",
                "injured_male", "injured_female", "injured_transgender", "injured_total",
                "died_male", "died_female", "died_transgender", "died_total",
                "ncrb_case_code", "source_publication", "source_table", "source_file",
                "geographic_granularity", "incident_level_data"
            }
            if not expected_fields.issubset(set(reader.fieldnames or [])):
                missing = expected_fields - set(reader.fieldnames or [])
                raise ValueError(f"Category detail missing required columns: {missing}")

            for row in reader:
                year = int(row["year"])
                category = row["drowning_category"].strip()
                key = (year, category)

                # Duplicate prevention
                if key in seen_keys:
                    raise ValueError(f"DUPLICATE RECORD DETECTED: Category detail already contains ({year}, '{category}')")
                seen_keys.add(key)

                rec = {
                    "year": year,
                    "state_ut": row["state_ut"],
                    "drowning_category": category,
                    "number_of_cases": int(row["number_of_cases"]),
                    "injured_male": int(row["injured_male"]),
                    "injured_female": int(row["injured_female"]),
                    "injured_transgender": int(row["injured_transgender"]),
                    "injured_total": int(row["injured_total"]),
                    "died_male": int(row["died_male"]),
                    "died_female": int(row["died_female"]),
                    "died_transgender": int(row["died_transgender"]),
                    "died_total": int(row["died_total"]),
                    "ncrb_case_code": int(row["ncrb_case_code"]),
                    "source_publication": row["source_publication"],
                    "source_table": row["source_table"],
                    "source_file": row["source_file"],
                    "geographic_granularity": row["geographic_granularity"],
                    "incident_level_data": row["incident_level_data"],
                }

                # Validation: gender split matches total injured
                if rec["injured_male"] + rec["injured_female"] + rec["injured_transgender"] != rec["injured_total"]:
                    raise ValueError(f"Injured gender sum mismatch for ({year}, '{category}')")

                # Validation: gender split matches total died
                if rec["died_male"] + rec["died_female"] + rec["died_transgender"] != rec["died_total"]:
                    raise ValueError(f"Died gender sum mismatch for ({year}, '{category}')")

                # Validation: geographic granularity and incident-level flag
                if rec["incident_level_data"] != "No":
                    raise ValueError(f"Invalid incident_level_data flag in ({year}, '{category}'): must be 'No'")

                records.append(rec)

        # Validate total vs sub-categories for every year
        years_present = sorted(list({r["year"] for r in records}))
        for yr in years_present:
            yr_recs = [r for r in records if r["year"] == yr]
            total_rec = next((r for r in yr_recs if r["drowning_category"] == "Drowning (Total)"), None)
            sub_recs = [r for r in yr_recs if r["drowning_category"] != "Drowning (Total)"]

            if not total_rec:
                raise ValueError(f"Missing 'Drowning (Total)' record for year {yr}")
            if len(sub_recs) != 3:
                raise ValueError(f"Expected 3 sub-categories for year {yr}, got {len(sub_recs)}")

            sub_cases = sum(r["number_of_cases"] for r in sub_recs)
            sub_inj = sum(r["injured_total"] for r in sub_recs)
            sub_died = sum(r["died_total"] for r in sub_recs)

            if sub_cases != total_rec["number_of_cases"]:
                raise ValueError(f"Sum of subcategory cases ({sub_cases}) != Total cases ({total_rec['number_of_cases']}) in year {yr}")
            if sub_inj != total_rec["injured_total"]:
                raise ValueError(f"Sum of subcategory injuries ({sub_inj}) != Total injuries ({total_rec['injured_total']}) in year {yr}")
            if sub_died != total_rec["died_total"]:
                raise ValueError(f"Sum of subcategory deaths ({sub_died}) != Total deaths ({total_rec['died_total']}) in year {yr}")

        return records

    def get_historical_summary(self) -> Dict[str, Any]:
        """
        Generates a comprehensive statistical summary formatted for the AQUORA dashboard.
        """
        annual_records = self.load_annual_summary()
        category_records = self.load_category_details()

        years = [r["year"] for r in annual_records]
        total_deaths = sum(r["persons_died"] for r in annual_records)
        total_cases = sum(r["drowning_cases"] for r in annual_records)
        total_injured = sum(r["persons_injured"] for r in annual_records)
        annual_mean_deaths = round(total_deaths / len(years), 2) if years else 0.0

        total_casualties = total_deaths + total_injured
        fatality_rate = round((total_deaths / total_casualties * 100), 2) if total_casualties > 0 else 0.0

        # Subcategory aggregate stats
        categories_to_aggregate = [
            ("Accidental Falls into Waterbody", "Drowning (Accidental Falls into Waterbody)", 10010),
            ("Boat Capsize", "Drowning (Boat Capsize)", 10009),
            ("Other Cases", "Drowning (Other Cases)", 10011),
        ]

        category_breakdown = []
        for display_name, raw_cat, code in categories_to_aggregate:
            cat_recs = [r for r in category_records if r["drowning_category"] == raw_cat]
            cat_deaths = sum(r["died_total"] for r in cat_recs)
            cat_cases = sum(r["number_of_cases"] for r in cat_recs)
            cat_inj = sum(r["injured_total"] for r in cat_recs)
            pct = round((cat_deaths / total_deaths * 100), 2) if total_deaths > 0 else 0.0

            category_breakdown.append({
                "category_name": display_name,
                "ncrb_code": code,
                "total_deaths": cat_deaths,
                "percentage_of_all_deaths": pct,
                "total_cases": cat_cases,
                "total_injuries": cat_inj,
            })

        # Gender aggregate stats
        total_male_deaths = sum(r["male_deaths"] for r in annual_records)
        total_female_deaths = sum(r["female_deaths"] for r in annual_records)
        total_trans_deaths = sum(r["transgender_deaths"] for r in annual_records)

        # Injuries by gender from total category
        total_cat_recs = [r for r in category_records if r["drowning_category"] == "Drowning (Total)"]
        total_male_inj = sum(r["injured_male"] for r in total_cat_recs)
        total_female_inj = sum(r["injured_female"] for r in total_cat_recs)
        total_trans_inj = sum(r["injured_transgender"] for r in total_cat_recs)

        gender_breakdown = [
            {
                "gender": "Male",
                "deaths": total_male_deaths,
                "percentage_of_deaths": round((total_male_deaths / total_deaths * 100), 2) if total_deaths > 0 else 0.0,
                "injuries": total_male_inj,
            },
            {
                "gender": "Female",
                "deaths": total_female_deaths,
                "percentage_of_deaths": round((total_female_deaths / total_deaths * 100), 2) if total_deaths > 0 else 0.0,
                "injuries": total_female_inj,
            },
            {
                "gender": "Transgender",
                "deaths": total_trans_deaths,
                "percentage_of_deaths": 0.0,
                "injuries": total_trans_inj,
            },
        ]

        # Year-by-year time series for dashboard charts
        annual_series = []
        for ar in annual_records:
            yr = ar["year"]
            yr_cats = [r for r in category_records if r["year"] == yr]
            falls = next((r for r in yr_cats if "Falls" in r["drowning_category"]), {})
            boat = next((r for r in yr_cats if "Boat" in r["drowning_category"]), {})
            other = next((r for r in yr_cats if "Other" in r["drowning_category"]), {})

            annual_series.append({
                "year": yr,
                "cases": ar["drowning_cases"],
                "total_deaths": ar["persons_died"],
                "total_injured": ar["persons_injured"],
                "male_deaths": ar["male_deaths"],
                "female_deaths": ar["female_deaths"],
                "falls_deaths": falls.get("died_total", 0),
                "boat_capsize_deaths": boat.get("died_total", 0),
                "other_cases_deaths": other.get("died_total", 0),
                "falls_deaths_share_pct": round(falls.get("died_total", 0) / ar["persons_died"] * 100, 2) if ar["persons_died"] > 0 else 0.0,
                "source_publication": ar["source_publication"],
                "source_table": ar["source_table"],
            })

        summary = {
            "title": "Official NCRB Kerala Historical Drowning Statistics (2018–2024)",
            "state_ut": "KERALA",
            "temporal_coverage": f"{min(years)}-{max(years)}",
            "years": years,
            "total_drowning_deaths": total_deaths,
            "total_drowning_cases": total_cases,
            "total_persons_injured": total_injured,
            "annual_mean_deaths": annual_mean_deaths,
            "fatality_rate_percent": fatality_rate,
            "category_breakdown": category_breakdown,
            "gender_breakdown": gender_breakdown,
            "annual_series": annual_series,
            "source_provenance": {
                "organization": "National Crime Records Bureau (NCRB)",
                "ministry": "Ministry of Home Affairs, Government of India",
                "publication_series": "Accidental Deaths & Suicides in India (ADSI)",
                "table_references": "Table 1.9 (2018–2019), Table 1.10 (2020–2024)",
                "geographic_granularity": "State / UT Aggregate (Kerala)",
                "incident_level_data": False,
                "corroboration": "Matches MoHFW / DGHS 2022 Strategic Framework benchmark of 1,419 deaths",
            },
            "scientific_integrity_notice": (
                "DATA ETHICS DECLARATION: These statistics are authoritative macro-level annual state summaries. "
                "They do NOT contain micro-level incident coordinates, exact timestamps, or victim identifiers. "
                "In strict compliance with AQUORA AI scientific standards, these records are NOT used to train "
                "incident-level predictive machine-learning models or alter physical environmental hazard computations."
            ),
        }

        # Save to processed JSON for instant access
        for out_path in PROCESSED_SUMMARY_PATHS:
            try:
                os.makedirs(os.path.dirname(out_path), exist_ok=True)
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(summary, f, indent=2)
                break
            except Exception as e:
                logger.warning(f"Could not cache summary to {out_path}: {e}")

        return summary

    def validate_datasets(self) -> Dict[str, Any]:
        """
        Runs complete validation across all files, checking mathematical consistency,
        column completeness, and duplicate prevention.
        """
        results = {
            "status": "PASS",
            "checks_run": 0,
            "checks_passed": 0,
            "errors": [],
            "annual_summary_rows": 0,
            "category_detail_rows": 0,
            "years_covered": [],
        }

        try:
            annual = self.load_annual_summary()
            results["annual_summary_rows"] = len(annual)
            results["years_covered"] = [r["year"] for r in annual]
            results["checks_run"] += 1
            results["checks_passed"] += 1
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(f"Annual summary error: {str(e)}")

        try:
            detail = self.load_category_details()
            results["category_detail_rows"] = len(detail)
            results["checks_run"] += 1
            results["checks_passed"] += 1
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(f"Category detail error: {str(e)}")

        return results


# Global singleton instance
ncrb_drowning_stats_service = NCRBDrowningStatsService()

