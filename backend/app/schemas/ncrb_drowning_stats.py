"""
AQUORA AI - Official Kerala NCRB ADSI Drowning Statistics Schemas
Authoritative Source: National Crime Records Bureau (NCRB) ADSI (2018–2024)
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class NCRBAnnualSummaryRecord(BaseModel):
    year: int = Field(..., description="Calendar reporting year (2018–2024)")
    state_ut: str = Field("KERALA", description="State or Union Territory name")
    drowning_cases: int = Field(..., ge=0, description="Total police cases registered for accidental drowning")
    persons_injured: int = Field(..., ge=0, description="Count of injured persons")
    persons_died: int = Field(..., ge=0, description="Count of deceased persons")
    male_deaths: int = Field(..., ge=0, description="Deceased male victims")
    female_deaths: int = Field(..., ge=0, description="Deceased female victims")
    transgender_deaths: int = Field(0, ge=0, description="Deceased transgender victims")
    source_publication: str = Field(..., description="NCRB ADSI publication volume")
    source_table: str = Field(..., description="Table number in official publication")
    source_file: str = Field(..., description="Source extraction file")


class NCRBCategoryDetailRecord(BaseModel):
    year: int = Field(..., description="Calendar year")
    state_ut: str = Field("KERALA", description="State or Union Territory name")
    drowning_category: str = Field(..., description="Accidental drowning subcategory or Total")
    number_of_cases: int = Field(..., ge=0, description="Registered cases")
    injured_male: int = Field(..., ge=0, description="Injured males")
    injured_female: int = Field(..., ge=0, description="Injured females")
    injured_transgender: int = Field(0, ge=0, description="Injured transgender persons")
    injured_total: int = Field(..., ge=0, description="Total injured")
    died_male: int = Field(..., ge=0, description="Deceased males")
    died_female: int = Field(..., ge=0, description="Deceased females")
    died_transgender: int = Field(0, ge=0, description="Deceased transgender persons")
    died_total: int = Field(..., ge=0, description="Total deaths")
    ncrb_case_code: int = Field(..., description="Official NCRB taxonomy classification code (10008-10011)")
    source_publication: str = Field(..., description="Publication identifier")
    source_table: str = Field(..., description="Table reference")
    source_file: str = Field(..., description="Extraction file")
    geographic_granularity: str = Field("State/UT aggregate", description="Geographic level of reporting")
    incident_level_data: str = Field("No", description="Explicit flag confirming non-micro-incident nature")


class NCRBCategorySummaryItem(BaseModel):
    category_name: str
    ncrb_code: int
    total_deaths: int
    percentage_of_all_deaths: float
    total_cases: int
    total_injuries: int


class NCRBGenderDistributionItem(BaseModel):
    gender: str
    deaths: int
    percentage_of_deaths: float
    injuries: int


class NCRBHistoricalSummaryResponse(BaseModel):
    title: str = Field(..., description="Summary title")
    state_ut: str = Field("KERALA", description="Geographic scope")
    temporal_coverage: str = Field("2018-2024", description="Covered period")
    years: List[int] = Field(default_factory=list, description="Array of included calendar years")
    total_drowning_deaths: int = Field(..., description="7-year cumulative deaths")
    total_drowning_cases: int = Field(..., description="7-year cumulative cases")
    total_persons_injured: int = Field(..., description="7-year cumulative injuries")
    annual_mean_deaths: float = Field(..., description="Average annual fatalities")
    fatality_rate_percent: float = Field(..., description="Deaths / (Deaths + Injuries) percentage")
    category_breakdown: List[NCRBCategorySummaryItem] = Field(default_factory=list)
    gender_breakdown: List[NCRBGenderDistributionItem] = Field(default_factory=list)
    annual_series: List[Dict[str, Any]] = Field(default_factory=list)
    source_provenance: Dict[str, Any] = Field(default_factory=dict)
    scientific_integrity_notice: str = Field(..., description="Data ethics, non-training, and macro-granularity disclaimer")

