# AQUORA AI — Remaining Features Roadmap & Implementation Plan

**System:** AQUORA AI — Predictive Inland Water Safety, Hydrodynamic Risk Assessment & Decision Support System (Kerala)  
**Date of Audit & Roadmap Creation:** October 30, 2026 — 13:25 IST  
**Architectural Baseline:** Commit `c0bd5ba`, 225 Backend Tests, 79 Frontend Tests, Production Build Verified, Alembic Head `32f7cdf14f88`.

---

## 1. Feature Classification Taxonomy

In accordance with system design principles and scientific integrity mandates, all proposed features are classified into one of five rigorous tiers:

| Tier | Classification | Definition & Action |
|:---:|:---|:---|
| **Tier 1** | **Already Implemented & Verified** | Feature exists in code, passes automated tests, and operates cleanly in the running application. Preserve without regression. |
| **Tier 2** | **Partially Implemented** | Foundational architecture exists (e.g., provider abstractions, mock endpoints) but lacks full lifecycle handling, retries, or UI binding. Requires completion. |
| **Tier 3** | **Missing and Feasible to Implement** | Core production-grade feature that can be fully implemented using the existing tech stack (FastAPI, SQLAlchemy, SQLite, React 19, TypeScript) without external blockers. |
| **Tier 4** | **Blocked by External Credentials / Services** | Requires paid or government-restricted API keys (e.g., active NWIC production bearer tokens, Twilio paid SMS credits, Google Maps paid geocoding). Requires mock/sandbox provider, transparent status reporting, and zero simulated fabrication. |
| **Tier 5** | **Optional Enhancement** | Nice-to-have visual or experimental feature that is non-essential for capstone defense or operational MVP. Deferred or implemented conditionally. |

---

## 2. Comprehensive Feature Classification Matrix

### Domain A: Live Environmental Telemetry
| ID | Feature Description | Classification | Current State & Technical Implementation Path |
|:---|:---|:---:|:---|
| **A.1** | NWIC / India-WRIS Official Telemetry Provider | **Tier 4** (Blocked by government registration) | `LiveNWICProvider` implemented with Bearer auth, timeout, and cache. Returns `UNAVAILABLE` when `NWIC_API_KEY` is unset. Provide complete documentation of NWIC/WRIS registration and endpoints. |
| **A.2** | Telemetry Provider Health & Connectivity Status API | **Tier 3** (Missing & Feasible) | Implement `GET /api/v1/telemetry/providers/status` checking latency, connectivity, last polling timestamp, and active provider for each station. |
| **A.3** | UI Telemetry Source & Connectivity Indicator | **Tier 3** (Missing & Feasible) | Add live status pill and last-updated badge to header/map details, displaying provider attribution (`Open-Meteo`, `NWIC Archive`, `Kerala SW`). |
| **A.4** | Open-Meteo High-Resolution Live Atmospheric Telemetry | **Tier 1** (Already Implemented) | Fully operational: live temperature, rainfall, wind speed, elevation, and 48h forecast with 15-min TTL caching. |
| **A.5** | Absolute No-Fabrication Safeguard | **Tier 1** (Already Implemented) | Strict rule enforced across all routes: never substitutes synthesized stage readings as live data. |

### Domain B: Real Alert Delivery & Channel Reliability
| ID | Feature Description | Classification | Current State & Technical Implementation Path |
|:---|:---|:---:|:---|
| **B.1** | Webhook Alert Provider (Discord, Slack, RFC REST) | **Tier 1** (Already Implemented) | RFC-compliant payload formatting with Discord/Slack webhooks and delivery audit logging. |
| **B.2** | Standard SMTP Email Delivery Provider | **Tier 2** (Partially Implemented) | Implemented in `alert_service.py` via `smtplib` with STARTTLS. Needs transient retry handling and connection test validation. |
| **B.3** | Twilio SMS Gateway Provider | **Tier 4** (Blocked by external Twilio account) | Implemented in `alert_service.py`. Safe test mode works; real SMS requires account SID/auth token. Needs transparent status validation. |
| **B.4** | Transient Retry Handling with Exponential Backoff | **Tier 3** (Missing & Feasible) | Add 2-stage retry with exponential backoff ($0.5\text{s}, 1.0\text{s}$) for transient HTTP/SMTP network timeouts before marking delivery failed. |
| **B.5** | Alert Channel Configuration Validation Endpoint | **Tier 3** (Missing & Feasible) | Implement `POST /api/v1/alerts/validate-channels` to test network reachability of configured SMTP/webhook endpoints without firing live alerts. |
| **B.6** | Alert Deliveries Query & Filter API | **Tier 3** (Missing & Feasible) | Enhance `GET /api/v1/alerts/deliveries` with query filters (`channel`, `status`, `severity`, `limit`). |

### Domain C: User Authentication & Role-Based Access Control (RBAC)
| ID | Feature Description | Classification | Current State & Technical Implementation Path |
|:---|:---|:---:|:---|
| **C.1** | Relational User Model & Database Persistence | **Tier 3** (Missing & Feasible) | Create `UserModel` with fields `id`, `email`, `username`, `full_name`, `hashed_password`, `salt`, `role`, `is_active`, `created_at`. Apply Alembic migration. |
| **C.2** | Secure Password Hashing & Salt Handling | **Tier 3** (Missing & Feasible) | Implement standard library PBKDF2-HMAC-SHA256 with 100,000 iterations and per-user unique salt (zero unmaintained C-library dependencies). |
| **C.3** | JWT / Session Token Generation & Verification | **Tier 3** (Missing & Feasible) | Implement HMAC-SHA256 stateless access token generation with configurable expiry and security dependencies. |
| **C.4** | Role-Based Access Control (RBAC) Dependency | **Tier 3** (Missing & Feasible) | Roles: `ADMIN`, `OFFICER`, `INSPECTOR`, `VIEWER`. Protect sensitive endpoints (alert dispatch, inspection scheduling/mutations, data imports). |
| **C.5** | Auth REST Endpoints (`login`, `me`, `logout`) | **Tier 3** (Missing & Feasible) | Endpoints: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`. Seed default accounts (Admin, Officer, Inspector, Guest). |
| **C.6** | Frontend Auth Context, Role Badge & Login Modal | **Tier 3** (Missing & Feasible) | React context with local session persistence, header user profile avatar, and login dialog with 1-click test role switcher for demo evaluation. |

### Domain D: Data Management & Import/Export
| ID | Feature Description | Classification | Current State & Technical Implementation Path |
|:---|:---|:---:|:---|
| **D.1** | Water-Body Catalog CSV Export | **Tier 3** (Missing & Feasible) | Implement `GET /api/v1/data/export/water-bodies` streaming CSV with coordinates, type, current stage, normal stage, and risk score. |
| **D.2** | Municipal Inspections Ledger CSV Export | **Tier 3** (Missing & Feasible) | Implement `GET /api/v1/data/export/inspections` streaming CSV of scheduled and completed audits with verified safety measures. |
| **D.3** | Water-Body Dataset CSV Import with Duplicate Detection | **Tier 3** (Missing & Feasible) | Implement `POST /api/v1/data/import/water-bodies` validating Kerala coordinates, detecting duplicate names or coordinate pairs, and inserting records. |
| **D.4** | Database Snapshot Backup Utility | **Tier 3** (Missing & Feasible) | Implement `GET /api/v1/data/backup` generating a clean, point-in-time SQLite database dump for disaster recovery. |

### Domain E: Reporting & Analytics
| ID | Feature Description | Classification | Current State & Technical Implementation Path |
|:---|:---|:---:|:---|
| **E.1** | Formal Site Hazard Assessment Printable Report | **Tier 3** (Missing & Feasible) | Implement `GET /api/v1/reports/hazard-assessment/{water_body_id}` rendering a standalone, print-optimized HTML/PDF report with executive telemetry, Layer A/B analysis, and official sign-off block. |
| **E.2** | District-Wise Hazard Summary & Compliance Analytics | **Tier 3** (Missing & Feasible) | Implement `GET /api/v1/reports/district-summary` aggregating all 14 Kerala districts (site counts, high-risk counts, compliance rates, mean flow velocity). |
| **E.3** | Machine-Learning Performance Benchmark Report | **Tier 3** (Missing & Feasible) | Implement `GET /api/v1/reports/model-benchmarks` detailing Ridge regression evaluation across Ramamangalam, Pala, Trinayakudam and HistGradientBoosting metrics. |
| **E.4** | Frontend Reports & Export Center Dialog | **Tier 3** (Missing & Feasible) | Add clean export modal in UI allowing 1-click download of printable reports and CSV datasets. |

### Domain F: Administration & Monitoring
| ID | Feature Description | Classification | Current State & Technical Implementation Path |
|:---|:---|:---:|:---|
| **F.1** | System Diagnostics & Operational Telemetry | **Tier 3** (Missing & Feasible) | Implement `GET /api/v1/admin/diagnostics` reporting database file size, memory usage, open connections, ML models status, cache hit counts, and external service latency. |
| **F.2** | Application Security & Operational Log Viewer | **Tier 3** (Missing & Feasible) | Implement `GET /api/v1/admin/logs` returning recent operational events, alert dispatches, and security warnings from an in-memory audit ring buffer. |
| **F.3** | User Management Endpoints | **Tier 3** (Missing & Feasible) | Implement `GET /api/v1/admin/users` and `PATCH /api/v1/admin/users/{user_id}` for administrator governance of staff accounts. |
| **F.4** | Frontend Admin & Diagnostics Console | **Tier 3** (Missing & Feasible) | Add an Admin & Diagnostics module in the Operations Desk accessible to users with `ADMIN` role. |

### Domain G: Production Deployment & Containerization
| ID | Feature Description | Classification | Current State & Technical Implementation Path |
|:---|:---|:---:|:---|
| **G.1** | Backend Production Dockerfile | **Tier 3** (Missing & Feasible) | Multi-stage Python 3.11 slim Dockerfile with non-root security user, volume mount for `aquora.db`, and healthcheck. |
| **G.2** | Frontend Production Dockerfile | **Tier 3** (Missing & Feasible) | Multi-stage build (Node 22 build $\rightarrow$ Nginx Alpine reverse proxy container). |
| **G.3** | Unified Docker Compose Orchestration | **Tier 3** (Missing & Feasible) | `docker-compose.yml` linking backend and frontend with persistent storage volume and healthcheck dependencies. |
| **G.4** | Production Configuration Template | **Tier 3** (Missing & Feasible) | `.env.production.example` with hardened security settings, CORS configuration, and production flags. |
| **G.5** | Comprehensive Production Deployment Manual | **Tier 3** (Missing & Feasible) | `docs/DEPLOYMENT_GUIDE.md` detailing Docker Compose deployment, reverse proxy setup, SSL with Let's Encrypt, and systemd service templates. |

---

## 3. Phased Implementation Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│                     IMPLEMENTATION STAGES (A TO G)                     │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 1: Core Security & RBAC Infrastructure (Domain C)                │
│ - UserModel, PBKDF2 password hashing, JWT/Session tokens               │
│ - Alembic migration, auth routes (/login, /me, /logout), seed accounts │
│ - Verify 225+ backend tests & migration lifecycle                      │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 2: Data Management, Import/Export & Backups (Domain D)           │
│ - CSV export for water bodies & inspections                            │
│ - CSV import with duplicate detection & Kerala bounds validation       │
│ - Database backup snapshot utility                                     │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 3: Formal Reporting, Analytics & Printable Reports (Domain E)    │
│ - Printable HTML/PDF hazard assessment report endpoint                 │
│ - District-wise water safety summary aggregation                       │
│ - Machine-learning benchmark audit report endpoint                     │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 4: Alert Delivery Resilience & Diagnostics (Domains A, B, F)     │
│ - Retry handling with backoff in Webhook/Email/SMS providers           │
│ - Telemetry provider status & channel configuration validation         │
│ - Admin diagnostics & in-memory audit log buffer                       │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 5: Frontend UI Integration & Production Build (Domains C, D, E, F)│
│ - AuthContext with test role switcher (Admin / Officer / Inspector)    │
│ - Reports & Export modal in Operations Desk                            │
│ - Admin & System Diagnostics panel                                     │
│ - Verify 79+ frontend tests & production build                         │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 6: Production Containerization & Deployment Manual (Domain G)    │
│ - Backend Dockerfile, Frontend Dockerfile, docker-compose.yml          │
│ - Production environment template & docs/DEPLOYMENT_GUIDE.md           │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 7: Final End-to-End Verification & Documentation Update          │
│ - Run full backend & frontend test suites                              │
│ - Verify live API endpoints & production bundle                        │
│ - Deliver complete audit report                                        │
└────────────────────────────────────────────────────────────────────────┘
```


---

## 4. Implementation Completion Audit

| Stage | Domain Covered | Implementation Deliverables | Verification Status |
| :---: | :--- | :--- | :---: |
| **Stage 1** | **Domain C** (Security & RBAC) | `UserModel`, `security.py` (PBKDF2-HMAC-SHA256, unique 32-byte salts, JWT tokens), Alembic migration `c527260f050e`, auth endpoints (`/login`, `/me`, `/logout`, `/register`, `/change-password`, `/roles`), 4 seeded roles | **VERIFIED** (13/13 tests passed) |
| **Stage 2** | **Domain D** (Data Management) | `data_management_service.py`, CSV water bodies export, CSV inspection ledger export, CSV import with duplicate prevention & Kerala bounding box check, SQLite binary snapshot backup | **VERIFIED** (7/7 tests passed) |
| **Stage 3** | **Domain E** (Reporting & Analytics) | `reporting_service.py`, Printable HTML / PDF Executive Hazard Dossier with official sign-off block, structured JSON endpoint, 14-District risk summary aggregation, ML model benchmarks report | **VERIFIED** (5/5 tests passed) |
| **Stage 4** | **Domains A, B, F** (Alert Resilience & Admin) | 2-stage retry loop with exponential backoff ($0.5\text{s}, 1.0\text{s}$) in alert providers, `POST /alerts/validate-channels`, `GET /telemetry/providers/status`, `admin_routes.py` (`diagnostics`, `users`, `logs` ring buffer) | **VERIFIED** (6/6 tests passed) |
| **Stage 5** | **Frontend Integration** | `AuthContext.tsx` with 1-click role switcher, Header user badge & role dropdown, `ReportsExportModal.tsx`, `AdminConsoleModal.tsx`, API service extensions | **VERIFIED** (79/79 Vitest passed, production build clean in 30.03s) |
| **Stage 6** | **Domain G** (Containerization) | `backend/Dockerfile` (multi-stage Python 3.11, non-root UID 10001, volume mount, healthcheck), `frontend/Dockerfile` (Node 22 $\rightarrow$ Nginx Alpine), `nginx.conf`, `docker-compose.yml`, `.env.production.example`, `docs/DEPLOYMENT_GUIDE.md` | **VERIFIED** (Configuration validated, zero syntax errors) |
| **Stage 7** | **Full System Audit** | Complete test suite execution: **256 backend pytest tests passed** (0 failures, 0 skipped), **79 frontend vitest tests passed**, 0 build errors. | **VERIFIED & PRODUCTION READY** |
