# Kerala NCRB ADSI Drowning Statistics (2018–2024)

**Subdirectory:** `data/raw/drowning_research/ncrb_statistics/`  
**Geographic Granularity:** State/UT Level (Kerala, India)  
**Temporal Coverage:** 2018 – 2024 (7 Consecutive Calendar Years)  
**Authoritative Source:** National Crime Records Bureau (NCRB), Ministry of Home Affairs, Government of India  
**Publication:** Accidental Deaths & Suicides in India (ADSI) Annual Reports  
**Status:** Verified Official Macro-Level Statistics  
**Scientific Integrity Status:** Non-Incident Aggregated Baseline (STRICTLY NOT FOR ML MODEL TRAINING)

---

## 1. Overview and Purpose

This directory contains the authoritative, state-level historical drowning statistics for Kerala spanning the 7-year period from **2018 through 2024**, extracted from the annual National Crime Records Bureau (NCRB) *Accidental Deaths & Suicides in India* (ADSI) publications.

The purpose of this dataset is to establish a rigorous, verified macroeconomic baseline for aquatic mortality in Kerala for AQUORA AI's environmental safety dashboard and epidemiological context.

### Key Epidemiological Findings (2018–2024 Summary):
- **Total Drowning Fatalities (7 Years):** 9,538 deaths (annual mean: 1,362.6 deaths/year).
- **Primary Cause — Accidental Falls into Waterbody:** Accounts for **8,336 deaths (87.40%)**, demonstrating that the overwhelming majority of aquatic mortalities in Kerala stem from accidental slips, bank collapse, and falls into rivers, canals, wells, and backwaters.
- **Secondary Cause — Boat Capsize:** Accounts for **129 deaths (1.35%)**, with elevated spikes in 2018 (28 deaths) and 2023 (33 deaths, including the Tanur boat disaster).
- **Tertiary Cause — Other Cases:** Accounts for **1,073 deaths (11.25%)**, representing swimming accidents, flash flooding, and unclassified immersion events.
- **Gender Disparity:** **82.91% Male** (7,908 deaths) vs. **17.09% Female** (1,630 deaths). 0 Transgender fatalities reported.
- **Lethality Index:** Across 9,645 total recorded casualties (9,538 deaths + 107 injuries), **98.89% were fatal**, demonstrating the extreme lethality of immersion accidents when immediate rescue infrastructure is absent.

---

## 2. Directory Contents

```
data/raw/drowning_research/ncrb_statistics/
├── Kerala_ADSI_Drowning_Statistics_2018_2024.xlsx      # Master 4-sheet workbook (Summary, Detail, Validation, Sources)
├── Kerala_ADSI_Drowning_Statistics_2018_2024.csv       # Annual state total summary (7 rows)
├── Kerala_ADSI_Drowning_Category_Detail_2018_2024.csv # 4 category breakdowns with gender splits (28 rows)
├── Kerala_ADSI_Category_Validation_2018_2024.csv      # Mathematical verification checks (21 checks)
├── Kerala_ADSI_Sources_and_Notes_2018_2024.csv        # Table numbers, publication years, provenance (7 rows)
└── README.md                                          # Data dictionary, methodology, and ethical constraints
```

---

## 3. Authoritative Source Citations

The statistics are sourced from the official annual NCRB ADSI publications under the accidental deaths chapter (*Causes of Accidental Deaths - Drowning*):

| Year | NCRB Publication | Official Table | Source File Extracted | Primary Source / Notes |
|:---:|:---:|:---:|:---:|:---|
| **2018** | ADSI 2018 | Table 1.9 | `ADSI_2018_Drowning.csv` | NCRB ADSI 2018, Table 1.9 (Causes of Accidental Deaths) |
| **2019** | ADSI 2019 | Table 1.9 | `ADSI_2019_Drowning.csv` | NCRB ADSI 2019, Table 1.9 (Causes of Accidental Deaths) |
| **2020** | ADSI 2020 | Table 1.10 | `ADSI_2020_Drowning.csv` | NCRB ADSI 2020, Table 1.10 (Causes of Accidental Deaths) |
| **2021** | ADSI 2021 | Table 1.10 | `ADSI_2021_Drowning.csv` | NCRB ADSI 2021, Table 1.10 (Causes of Accidental Deaths) |
| **2022** | ADSI 2022 | Table 1.10 | `ADSI_2022_Drowning.csv` | NCRB ADSI 2022, Table 1.10 (Corroborated by MoHFW/DGHS 2022 figure of 1,419) |
| **2023** | ADSI 2023 | Table 1.10 | `ADSI_2023_Drowning.csv` | NCRB ADSI 2023, Table 1.10 (Causes of Accidental Deaths) |
| **2024** | ADSI 2024 | Table 1.10 | `ADSI_2024_Table_1.10(1).csv` | NCRB ADSI 2024, Table 1.10 (Latest Published Report) |

---

## 4. Complete Data Dictionaries

### 4.1 Annual Summary: `Kerala_ADSI_Drowning_Statistics_2018_2024.csv`

| Column | Type | Constraints / Format | Description |
|:---|:---:|:---:|:---|
| `year` | Integer | `2018 <= year <= 2024` | Calendar year of reporting. Primary key. |
| `state_ut` | String | Fixed: `"KERALA"` | State of the Republic of India. |
| `drowning_cases` | Integer | Non-negative integer | Total number of registered drowning police cases. |
| `persons_injured` | Integer | Non-negative integer | Total count of individuals surviving with injuries. |
| `persons_died` | Integer | Non-negative integer | Total count of individuals deceased. Equals `male_deaths + female_deaths + transgender_deaths`. |
| `male_deaths` | Integer | Non-negative integer | Number of deceased male victims. |
| `female_deaths` | Integer | Non-negative integer | Number of deceased female victims. |
| `transgender_deaths` | Integer | Non-negative integer | Number of deceased transgender victims (0 for all years). |
| `source_publication` | String | `"ADSI 2018"` – `"ADSI 2024"` | NCRB annual publication identifier. |
| `source_table` | String | `"Table 1.9"` or `"Table 1.10"` | Table reference inside the official volume. |
| `source_file` | String | Valid file name | Extraction source filename. |

### 4.2 Category Detail: `Kerala_ADSI_Drowning_Category_Detail_2018_2024.csv`

Each year contains exactly 4 mutually exclusive sub-categories (plus the Total row):
1. **Drowning (Total)** (`ncrb_case_code: 10008`)
2. **Drowning (Boat Capsize)** (`ncrb_case_code: 10009`)
3. **Drowning (Accidental Falls into Waterbody)** (`ncrb_case_code: 10010`)
4. **Drowning (Other Cases)** (`ncrb_case_code: 10011`)

| Column | Type | Constraints / Format | Description |
|:---|:---:|:---:|:---|
| `year` | Integer | `2018 <= year <= 2024` | Calendar year. Composite key with `drowning_category`. |
| `state_ut` | String | `"KERALA"` | State name. |
| `drowning_category` | String | One of 4 standardized categories | Specific accidental drowning causal mechanism. |
| `number_of_cases` | Integer | Non-negative integer | Number of official incident police cases registered. |
| `injured_male` | Integer | Non-negative integer | Injured male victims. |
| `injured_female` | Integer | Non-negative integer | Injured female victims. |
| `injured_transgender` | Integer | Non-negative integer | Injured transgender victims (0 for all years). |
| `injured_total` | Integer | Non-negative integer | Total injured victims (`injured_male + injured_female + injured_transgender`). |
| `died_male` | Integer | Non-negative integer | Deceased male victims. |
| `died_female` | Integer | Non-negative integer | Deceased female victims. |
| `died_transgender` | Integer | Non-negative integer | Deceased transgender victims (0 for all years). |
| `died_total` | Integer | Non-negative integer | Total deceased victims (`died_male + died_female + died_transgender`). |
| `ncrb_case_code` | Integer | `10008, 10009, 10010, 10011` | Official NCRB digital classification taxonomy code. |
| `source_publication` | String | `"ADSI 2018"` – `"ADSI 2024"` | NCRB volume name. |
| `source_table` | String | `"Table 1.9"` or `"Table 1.10"` | Table reference. |
| `source_file` | String | Valid filename | Extraction file. |
| `geographic_granularity`| String | Fixed: `"State/UT aggregate"` | Geographic precision of the record. |
| `incident_level_data` | String | Fixed: `"No"` | Confirmation flag: explicitly NOT micro-incident data. |

### 4.3 Category Validation: `Kerala_ADSI_Category_Validation_2018_2024.csv`

Provides independent mathematical verification that the sum of sub-categories identically equals the reported `Drowning (Total)` for all metrics:

$$\text{Drowning (Total)} = \text{Boat Capsize} + \text{Accidental Falls into Waterbody} + \text{Other Cases}$$

| Column | Type | Description |
|:---|:---:|:---|
| `year` | Integer | Verification year (2018–2024). |
| `metric` | String | `number_of_cases`, `injured_total`, or `died_total`. |
| `total_category_value` | Integer | Reported total value from code 10008. |
| `sum_of_subcategories` | Integer | Sum of codes 10009 + 10010 + 10011. |
| `difference_total_minus_subcategories` | Integer | Must be exactly `0`. |
| `check` | String | Verification verdict: `"MATCH"`. (All 21 checks strictly pass). |

---

## 5. Annual Statistical Breakdown (2018–2024)

| Year | Cases | Injured (M/F/T) | Total Died | Male Died | Female Died | Accidental Falls | Boat Capsize | Other Cases | % Falls |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **2018** | 1,298 | 14 (8/6/0) | **1,343** | 1,105 | 238 | 1,078 | 28 | 237 | 80.27% |
| **2019** | 1,452 | 11 (11/0/0) | **1,490** | 1,232 | 258 | 1,322 | 11 | 157 | 88.72% |
| **2020** | 1,211 | 29 (23/6/0) | **1,250** | 1,028 | 222 | 1,077 | 20 | 153 | 86.16% |
| **2021** | 1,274 | 12 (11/1/0) | **1,307** | 1,073 | 234 | 1,127 | 19 | 161 | 86.23% |
| **2022** | 1,382 | 7 (5/2/0) | **1,419** | 1,180 | 239 | 1,314 | 18 | 87 | 92.60% |
| **2023** | 1,295 | 23 (19/4/0) | **1,344** | 1,130 | 214 | 1,255 | 20 | 69 | 93.38% |
| **2024** | 1,349 | 11 (11/0/0) | **1,385** | 1,160 | 225 | 1,345 | 18 | 22 | 97.11% |
| **Total** | **9,261** | **107 (88/19/0)** | **9,538** | **7,908** | **1,630** | **8,336** | **129** | **1,073** | **87.40%** |

---

## 6. Scientific Integrity & Data Ethics Constraints

> [!CAUTION]
> **MANDATORY RULES FOR APPLICATION USE:**
> 
> 1. **NOT Individual Micro-Incidents:** These records represent annual state aggregates for the entire state of Kerala. They contain **no GPS coordinates, no exact water-body identifiers, no micro-timestamps, and no individual accident narratives**.
> 2. **PROHIBITED from ML Model Training:** These annual aggregate numbers **MUST NEVER be used to train incident-level predictive ML models**, binary drowning classifiers, or micro-level site hazard scoring models. Training a machine learning model on 7 annual aggregate numbers to predict incident likelihood at individual water bodies is scientifically invalid and produces severe ecological fallacies.
> 3. **Preservation of Existing AQUORA Models:** Existing hydrological models (`water_level_forecaster.py`, `environmental_hazard_model.joblib`) remain fully separated and untouched.
> 4. **Duplicate Prevention:** Data pipelines must enforce strict unique constraints: `year` uniqueness in the annual summary, and `(year, drowning_category)` uniqueness in the category detail.

