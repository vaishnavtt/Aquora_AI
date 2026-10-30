# Kerala Drowning Research Dataset — Starter Pack

**Directory:** `data/raw/drowning_research/`  
**Temporal Horizon:** 2018–2025  
**Geographic Coverage:** Kerala, India (All 14 Administrative Districts)  
**Status:** Starter Research Pack & Schema Specifications (Non-Operational / Non-Training)  
**Maintained by:** AQUORA AI Hydrological & Environmental Safety Research Initiative  

---

## 1. Overview & Research Objective

This directory contains the **Kerala Drowning Research Dataset — Starter Pack**, designed to establish standardized schemas, source registers, and baseline historical aggregates for studying drowning-related environmental risks in Kerala.

Drowning represents a severe public health hazard in Kerala, with official figures reporting approximately **1,000 to 1,400 accidental drowning fatalities annually** (e.g., **1,419 deaths in 2022** according to the Ministry of Health and Family Welfare / DGHS citing National Crime Records Bureau records).

This starter pack prepares the structural foundation for future evidence-based aquatic risk research. It provides:
1. **Sourced Historical Statistics:** Verified macro-level national (2018–2022) and Kerala state-level (2022) drowning death statistics from published official reports.
2. **Authoritative Source Register:** A catalog of official government statistical portals, open data catalogs, and disaster management portals.
3. **Structured Schema Templates:** Standardized schemas for district-year time series, geocoded incident logs, high-frequency hydrological telemetry, and water-body physical inventories.

---

## 2. Core Scientific & Data Integrity Principles

> [!CAUTION]
> **CRITICAL DATA ETHICS & SCIENTIFIC INTEGRITY RULES:**
>
> 1. **Blank Values Mean Unknown, NOT Zero:** In all templates (`district_year_template.csv`, `incident_registry.csv`, etc.), blank/empty cells signify that data has **not yet been sourced or verified**. They **must never be interpreted, parsed, or imputed as zero**.
> 2. **Zero Synthetic Incidents or Coordinates:** No micro-level drowning records, personal names, injury counts, or GPS coordinates have been fabricated. AQUORA AI strictly forbids synthesizing human casualties.
> 3. **NO Machine Learning Training on These Templates:** These files **must NOT be used to train supervised classification or regression models**. Training an incident classifier on empty templates or annual aggregate numbers is mathematically invalid and violates machine learning safety standards.
> 4. **No Modification of Existing AQUORA Datasets:** This starter pack is self-contained in `data/raw/drowning_research/` and does not overwrite or alter existing hydrological training pipelines (`rwl_tel_hr_*`, `rainfall_tel_*`, etc.) or production models.
> 5. **Privacy Safeguards:** In accordance with ethical standards, the schemas deliberately exclude personal identifiers (victim names, contact numbers, street addresses, or private phone logs).

---

## 3. Classification of Files: Sourced Statistics vs. Research Templates

The files in this directory are partitioned into three distinct categories:

```
data/raw/drowning_research/
├── ncrb_statistics/                 # VERIFIED NCRB ADSI KERALA DROWNING STATISTICS (2018–2024)
│   ├── Kerala_ADSI_Drowning_Statistics_2018_2024.xlsx      # Master 4-sheet workbook (Summary, Detail, Validation, Notes)
│   ├── Kerala_ADSI_Drowning_Statistics_2018_2024.csv       # Annual state total summary (7 rows)
│   ├── Kerala_ADSI_Drowning_Category_Detail_2018_2024.csv # 4 categories × 7 years with gender splits (28 rows)
│   ├── Kerala_ADSI_Category_Validation_2018_2024.csv      # Mathematical verification checks (21 checks)
│   ├── Kerala_ADSI_Sources_and_Notes_2018_2024.csv        # Table numbers, publication years, provenance (7 rows)
│   └── README.md                                          # Data dictionary, methodology, and ethical constraints
│
├── SOURCED HISTORICAL DATA & METADATA
│   ├── sourced_context.csv          # 6 verified historical annual aggregate rows (India & Kerala)
│   ├── source_register.csv          # 9 registered official government data sources (S1–S9)
│   ├── metadata.json                # Structured dataset metadata and schema definitions
│   └── start_here.csv               # Introductory metadata and research boundaries
│
└── EMPTY RESEARCH TEMPLATES (AWAITING SOURCING)
    ├── district_year_template.csv   # 112 grid rows (14 districts × 8 years, 2018–2025) - NOT_YET_SOURCED
    ├── incident_registry.csv        # Schema specification for geocoded micro-incidents (0 data rows)
    ├── hydrology_observations.csv   # Schema specification for coupled hydrological telemetry (0 data rows)
    └── waterbody_inventory.csv      # Schema specification for water-body physical infrastructure (0 data rows)
```

---

## 4. Detailed File Inspections & Schemas

### 4.1 Sourced Historical Statistics

#### `sourced_context.csv`
- **Purpose:** Documents verified national and state-level historical benchmarks.
- **Header:** `geography, year, drowning_deaths, measure, source`
- **Total Rows:** 7 (1 Header + 6 Populated Data Rows).
- **Populated Records:**
  - `India, 2018, 30178, National annual drowning deaths, MoHFW/DGHS graphic citing NCRB`
  - `India, 2019, 32671, National annual drowning deaths, MoHFW/DGHS graphic citing NCRB`
  - `India, 2020, 37238, National annual drowning deaths, MoHFW/DGHS graphic citing NCRB`
  - `India, 2021, 36362, National annual drowning deaths, MoHFW/DGHS graphic citing NCRB`
  - `India, 2022, 38503, National annual drowning deaths, MoHFW/DGHS graphic citing NCRB`
  - `Kerala, 2022, 1419, State total shown in state-wise chart, MoHFW/DGHS graphic citing NCRB`
- **Missing Values:** 0.0% (Fully populated).

#### `source_register.csv`
- **Purpose:** Catalogs primary official repositories for future verification.
- **Header:** `source_id, source_name, url, recommended_use`
- **Total Rows:** 10 (1 Header + 9 Populated Data Rows).
- **Key Registrations:**
  - `S1`–`S5`: National Crime Records Bureau (NCRB) ADSI published tables (2018, 2019, 2020, 2023, 2024 catalog).
  - `S6`: Kerala State Data Portal (`datahub.kerala.gov.in`).
  - `S7`: Kerala Online Data Repository — Department of Economics & Statistics (`odr.ecostat.kerala.gov.in`).
  - `S8`: Directorate General of Health Services (MoHFW/DGHS) Strategic Framework for Drowning Prevention.
  - `S9`: National Water Data Portal (NWIC) for in-situ hydrological telemetry.

#### `ncrb_statistics/` (Authoritative 2018–2024 Sourced Extracts)
- **Purpose:** Comprehensive official Kerala state drowning statistics extracted from NCRB ADSI annual volumes (2018–2024).
- **Files Included:**
  - `Kerala_ADSI_Drowning_Statistics_2018_2024.csv`: Annual state totals (cases, injuries, deaths, male/female/transgender splits).
  - `Kerala_ADSI_Drowning_Category_Detail_2018_2024.csv`: Category disaggregation into *Boat Capsize*, *Accidental Falls into Waterbody*, and *Other Cases* across all 7 years with gender splits and official NCRB case codes (10008–10011).
  - `Kerala_ADSI_Category_Validation_2018_2024.csv`: Complete mathematical proof verifying $\text{Total} = \text{Boat Capsize} + \text{Accidental Falls} + \text{Other Cases}$ with zero discrepancy.
  - `Kerala_ADSI_Sources_and_Notes_2018_2024.csv`: Publication years (ADSI 2018–2024), official table numbers (Table 1.9 for 2018–2019, Table 1.10 for 2020–2024), and verification notes.
  - `Kerala_ADSI_Drowning_Statistics_2018_2024.xlsx`: Master multi-sheet spreadsheet.
- **See Full Documentation:** [`ncrb_statistics/README.md`](file:///c:/Users/thott/Desktop/Aquora_AI/data/raw/drowning_research/ncrb_statistics/README.md).

---

### 4.2 Research Templates (Awaiting Official Sourcing)

#### `district_year_template.csv`
- **Purpose:** Systematic template for extracting district-level annual drowning figures across Kerala.
- **Header:** `year, district, drowning_deaths, drowning_incidents, injuries, source_document, source_page_or_table, verification_status, notes`
- **Total Rows:** 113 (1 Header + 112 Data Rows).
- **Coverage:** Spans all **14 Kerala districts** across **8 target years** ($14 \times 8 = 112$ district-year pairs):
  - Districts: *Alappuzha, Ernakulam, Idukki, Kannur, Kasaragod, Kollam, Kottayam, Kozhikode, Malappuram, Palakkad, Pathanamthitta, Thiruvananthapuram, Thrissur, Wayanad*.
  - Years: *2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025*.
- **Data Status:** Columns `drowning_deaths`, `drowning_incidents`, `injuries`, `source_document`, `source_page_or_table`, and `notes` are **100% blank**. Column `verification_status` is explicitly set to `"NOT_YET_SOURCED"` for all 112 rows.

#### `incident_registry.csv`
- **Purpose:** Standardized target schema for recording micro-level geocoded drowning incidents.
- **Header:** 26 columns:
  `incident_id, incident_date, incident_time, district, local_body, waterbody_name, waterbody_type, latitude, longitude, incident_outcome, incident_circumstances, people_affected, rainfall_1h_mm, rainfall_24h_mm, water_level_m, water_level_station, discharge_m3s, nearest_gauge_distance_km, source_agency, source_document_url, source_page_or_record_id, location_accuracy, time_accuracy, verification_status, privacy_review, notes`
- **Total Rows:** 1 (Header row only, **0 data rows**).

#### `hydrology_observations.csv`
- **Purpose:** Target schema for recording high-frequency in-situ sensor readings paired with incident times.
- **Header:** 18 columns:
  `observation_id, timestamp_ist, station_id, station_name, district, latitude, longitude, water_level_m, water_level_quality_flag, rainfall_1h_mm, rainfall_3h_mm, rainfall_24h_mm, discharge_m3s, source_agency, source_dataset, source_record_id, observed_or_modelled, notes`
- **Total Rows:** 1 (Header row only, **0 data rows**).

#### `waterbody_inventory.csv`
- **Purpose:** Target schema for site physical features, bathymetric depths, and safety infrastructure.
- **Header:** 17 columns:
  `waterbody_id, waterbody_name, district, local_body, waterbody_type, latitude, longitude, depth_m, flow_type, barrier_present, warning_sign_present, lifebuoy_present, accessibility_notes, source_agency, source_document_url, verification_status, notes`
- **Total Rows:** 1 (Header row only, **0 data rows**).

#### `start_here.csv`
- **Purpose:** Introductory instructions directly embedded from the research workbook.
- **Header:** `Item, Description` (9 rows).

---

## 5. Machine Learning Readiness Assessment

| Evaluation Dimension | Assessment | Detailed Scientific Rationale |
| :--- | :---: | :--- |
| **Supervised Incident Classification** | **NOT READY** | Requires thousands of verified, geocoded $(x, y, t)$ positive and negative incident records. Currently, `incident_registry.csv` has 0 rows. |
| **Mortality Count Regression** | **NOT READY** | `district_year_template.csv` contains 0 populated numbers (112 blank cells). Training on unpopulated or imputed zeros creates completely false relationships. |
| **Hydrological Feature Pairing** | **BLOCKED** | Without specific incident timestamps and coordinates, hydrological gauge measurements cannot be matched. |
| **Current Operational Role** | **READY AS SCHEMA** | Serves as a validated, standardized schema and source catalog to guide future official data requests to Kerala Police, Fire & Rescue Services, and SDMA. |

---

## 6. Recommended Next Steps for Official Sourcing

1. **RTI / Institutional Data Request:** Submit formal academic / public-safety requests to:
   - Kerala Fire & Rescue Services (Rescue & Retrieval Incident Logbooks).
   - Kerala State Disaster Management Authority (KSDMA Incident Tracking).
   - Kerala Police State Crime Records Bureau (SCRB FIR incident registers).
2. **Data Extraction into `district_year_template.csv`:** Populate annual district numbers directly from official NCRB ADSI Chapter 2 (Accidental Deaths) state tables for 2018–2024.
3. **Anonymized Geocoding:** Ensure all incident locations are geocoded at local body or river basin resolution without exposing personal victim identity.
4. **Hydrological Telemetry Coupling:** Spatially link verified incidents to nearest Kerala SW / NWIC river gauge sensor nodes using the schema defined in `hydrology_observations.csv`.

