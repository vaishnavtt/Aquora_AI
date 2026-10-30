# AQUORA AI — Data Sources, Provenance & Scientific Limitations

**System:** AQUORA AI Environmental Decision Support  
**Scope:** Kerala State Water Bodies (Rivers, Waterfalls, Quarry Pits, Reservoirs, Lakes, Canals)  
**Standard:** Truthful Data Provenance & Ethical Public Safety Reporting

---

## 1. Authoritative Data Sources

AQUORA AI integrates hydrological, meteorological, and geospatial datasets from recognized official agencies:

| Data Source | Agency / Provider | Data Modality | Update Frequency | Primary Use in AQUORA |
|:---|:---|:---|:---:|:---|
| **Kerala SW Hydrology** | Kerala State Water Resources Department | River stage ($m$), discharge ($m^3/s$), flow velocity | Hourly (where active) | Model training, baseline reference, calibration |
| **CWC Telemetry** | Central Water Commission (Govt. of India) | Gauge stage, historical flood markers, danger levels | Real-time / Daily | Waterway threshold calibration |
| **Open-Meteo API** | Open-Meteo Weather Services | Ambient temperature, precipitation rate, wind speed, elevation | Live API with 15-min TTL cache | Live weather overlays, What-If simulation inputs |
| **OpenStreetMap (OSM)** | OpenStreetMap Contributors (ODbL) | Waterway geometry, centerlines, riverbank polygons, district bounds | Ingested GeoJSON vectors | Spatial directory, map visualization, Haversine lookup |
| **KSDMA Guidelines** | Kerala State Disaster Management Authority | High-risk site classification (quarries, waterfall plunge pools) | Static regulatory guidelines | Layer B contextual site vulnerability scoring |

---

## 2. Provenance Taxonomy: Distinguishing Data Streams

To eliminate ambiguity and prevent misleading stakeholders, AQUORA AI categorizes every displayed data point into one of four strict provenance tiers:

### 2.1 Live Verified Telemetry (`LIVE`)
- **Definition:** Recent sensor observation retrieved from an active network endpoint within the last 3 hours.
- **Visual Indicator:** Solid Green Badge (`LIVE VERIFIED`) with explicit timestamp.
- **Current Coverage:** Open-Meteo meteorological readings (temperature, rainfall, wind speed).

### 2.2 Historical Archive Telemetry (`HISTORICAL`)
- **Definition:** Actual historical field observations recorded by Kerala SW or CWC during official monitoring runs.
- **Visual Indicator:** Amber Badge (`HISTORICAL ARCHIVE`) accompanied by exact observation timestamps.
- **Guarantee:** Never substitutes current system time for historical records.

### 2.3 Cached Telemetry (`CACHED`)
- **Definition:** Data recently fetched from an external provider and temporarily retained in-memory to prevent rate-limiting.
- **TTL Strategy:** Weather cache retains results for 15 minutes per latitude/longitude grid cell.

### 2.4 Synthetic Demonstration Benchmark (`DEMONSTRATION`)
- **Definition:** Simulated baseline values designed for testing application stability, edge cases, and UI workflows when field telemetry is offline.
- **Guarantee:** Explicitly tagged with `is_demonstration_data: true`.
- **Ethical Mandate:** Never fabricates real drowning incident records, emergency rescue dispatches, or fake victim casualties.

---

## 3. Missing, Stale & Invalid Data Handling

A core safety principle of AQUORA AI is that **missing data does NOT imply safety**:

1. **Unmonitored Water Bodies:**
   - When a water body lacks active sensor telemetry, it is marked as `UNRATED / HISTORICAL BASELINE`.
   - The system applies an **observational uncertainty penalty (+15 points)** to the inspection prioritization rank, prioritizing sites with unmeasured risk for physical inspection.
2. **Stale Telemetry ($> 24\text{ hours}$):**
   - Observations older than 24 hours trigger an automatic uncertainty flag and an advisory notice.
3. **Physical Range Rejection:**
   - River stage $< 0.0\text{ m}$ or $> 25.0\text{ m}$ is rejected as sensor noise.
   - Flow rate $< 0.0\text{ m}^3\text{/s}$ or $> 500.0\text{ m}^3\text{/s}$ is flagged for manual review.
   - Ambient water temperature $< 4^\circ\text{C}$ or $> 45^\circ\text{C}$ is rejected.

---

## 4. Scientific & Public Safety Limitations

> [!WARNING]
> **Mandatory Public Safety Notice:**
> AQUORA AI is a decision-support and environmental hazard assessment platform developed for academic research and municipal resource prioritization.

1. **Not a Drowning Incident Predictor:**
   - Drowning is an idiosyncratic event influenced by human behavior, alcohol consumption, swimming ability, hypothermia, panic, and unpredictable turbulent sub-surface vortices.
   - The platform **does not and cannot predict individual drowning accidents**.
2. **Not a Calibrated Drowning Probability:**
   - Numerical scores (0–100) quantify environmental hydrodynamic intensity and physical site exposure. They must **never be cited as percentage probabilities of fatality**.
3. **Recreational Swimming Warning:**
   - A `LOW` hazard rating indicates calm baseflow conditions compared to flood thresholds. It does **not** constitute a government-certified guarantee of safe swimming or bathing.
4. **Experimental What-If Scenarios:**
   - What-If simulations are heuristic stress-testing calculations designed for exploring sensitivity to rainfall and stage changes. They are **not certified 2D hydrodynamic flood routing models**.


---

## 5. National Water Informatics Centre (NWIC / India-WRIS) Telemetry Protocol

### 5.1 Real-World Integration Reality
- **Government Authorization Policy:** Live real-time telemetry from India-WRIS / National Water Informatics Centre (NWIC) requires institutional registration and credential approval from the Ministry of Jal Shakti.
- **Transparent Fallback Architecture:** In the absence of an authorized agency `NWIC_API_KEY`, AQUORA AI strictly avoids fabricating fake Indian river readings. The system:
  1. Accurately reports telemetry status as `AUTHENTICATION_REQUIRED` via `GET /api/v1/telemetry/providers/status`.
  2. Falls back to verified historical telemetry archives from the Kerala State Water Resources Department (Kerala SW 2021-2025 hourly records).
  3. Displays actual observation timestamps and archive provenance markers.
  4. Provides instant live stream verification through active USGS instantaneous telemetry (`11164500`), confirming end-to-end live ingestion pipeline stability.

### 5.2 Outbound Alert Delivery Integrity
- **No False Delivery Claims:** Alerts sent in safe test mode (`ALERT_TEST_MODE=true` or request `test_mode: true`) are recorded with status `TEST_MODE_SIMULATED`. The system strictly never reports simulated delivery as successful external transmission.
- **Upstream Confirmation Mandate:** An alert is marked `DELIVERED` only when the remote gateway (HTTP Webhook 200/201, SMTP 250 OK, or Twilio SMS accepted SID) explicitly returns confirmation.
- **Exponential Backoff & Deduplication:** Transient connection timeouts trigger up to 2 retries ($0.5\text{s}$, $1.0\text{s}$). Re-dispatches within 60 seconds matching the same water body and severity are safely suppressed.
