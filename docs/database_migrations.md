# AQUORA AI — Database Migrations & Schema Architecture Guide

This document defines the database migration strategy, Alembic configuration, schema lifecycle procedures, data-preservation guarantees, and troubleshooting runbooks for the AQUORA AI platform.

---

## 1. Migration Architecture & Directory Layout

AQUORA AI manages relational schema evolution via **Alembic** integrated with **SQLAlchemy 2.0** and **SQLite**. The migration harness is located in `backend/` and operates synchronously with the application models.

```text
Aquora_AI/
├── backend/
│   ├── alembic.ini                    # Alembic global CLI & path configuration
│   ├── alembic/                       # Alembic environment and script repository
│   │   ├── env.py                     # Runtime migration harness (batch mode & DB URL binding)
│   │   ├── script.py.mako             # Revision template
│   │   └── versions/                  # Versioned schema migration revisions
│   │       └── dfd0da3e179f_initial_schema_baseline.py  # Baseline adoption migration
│   ├── app/
│   │   ├── core/config.py             # Settings & predictable database URL resolution
│   │   ├── db/
│   │   │   ├── session.py             # Engine, SessionLocal, and declarative Base
│   │   │   └── init_db.py             # Application startup schema & synthetic seeder
│   │   └── models/                    # Declarative SQLAlchemy models
│   │       ├── water_body.py          # WaterBodyModel (`water_bodies`)
│   │       ├── alert.py               # AlertModel (`alerts`)
│   │       └── alert_delivery.py      # AlertDeliveryModel (`alert_deliveries`)
│   ├── aquora.db                      # Primary SQLite application database
│   ├── tests/
│   │   └── test_migrations.py         # Automated migration & data-preservation tests
│   └── requirements.txt               # Dependencies (`alembic>=1.13.0`, `sqlalchemy>=2.0.30`)
└── docs/
    └── database_migrations.md         # This technical reference
```

---

## 2. Database Configuration & SQLite Path Behavior

### Consistent Path Resolution
SQLite resolves relative database paths relative to the current working process directory. Inconsistent execution directories (e.g. executing from `root/` vs `backend/`) could inadvertently create duplicate databases (`backend/aquora.db` vs `aquora.db`).

To eliminate this ambiguity, AQUORA AI resolves the database URL dynamically in `backend/app/core/config.py`:

```python
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'aquora.db')).replace(os.sep, '/')}"
)
```

In `backend/alembic/env.py`, the configuration dynamically adopts this absolute database path while allowing overrides from isolated test environments:

```python
current_url = config.get_main_option("sqlalchemy.url")
if not current_url or "driver://user:pass" in current_url:
    config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
```

### SQLite Batch Mode Compatibility
SQLite does not natively support altering column types, drop-column, or add-constraint operations via simple `ALTER TABLE` statements. Alembic's **batch alter mode** (`render_as_batch=True`) is explicitly activated in both `run_migrations_online()` and `run_migrations_offline()`:

```python
context.configure(
    connection=connection,
    target_metadata=target_metadata,
    render_as_batch=True,  # Recreates SQLite tables seamlessly during schema modifications
)
```

---

## 3. Dependency Installation

Alembic is declared in `backend/requirements.txt`:

```bash
# From repository root or backend directory:
pip install -r backend/requirements.txt
```

Verify the installation and CLI availability:

```bash
python -m alembic --help
```

---

## 4. Fresh Database Initialization (Scenario 1)

For newly deployed instances or clean container environments without an existing `aquora.db`:

```bash
# Always execute migration commands from backend/ directory:
cd backend

# Apply all migrations up to head revision
python -m alembic upgrade head
```

This operation:
1. Creates the `alembic_version` tracking table.
2. Creates `water_bodies`, `alerts`, and `alert_deliveries` tables.
3. Generates the necessary indexes (`ix_water_bodies_id`, `ix_water_bodies_name`, `ix_alerts_id`).
4. Establishes foreign key relations (`alerts.water_body_id -> water_bodies.id`).

---

## 5. Existing Database Adoption & Schema Verification (Scenario 2)

Existing deployments that were initialized prior to Alembic using raw SQLite or `init_database()` already possess tables (`water_bodies`, `alerts`, `alert_deliveries`) populated with historical data.

### Safe Adoption Procedure (Zero Data Loss)
The initial baseline migration (`dfd0da3e179f_initial_schema_baseline.py`) was engineered with dynamic inspection:

```python
conn = op.get_bind()
inspector = sa.inspect(conn)
existing_tables = inspector.get_table_names()

# Tables are ONLY created if they do not pre-exist
if 'water_bodies' not in existing_tables:
    op.create_table('water_bodies', ...)

# Pre-existing tables have their column constraints aligned via batch mode
if 'water_bodies' in existing_tables:
    with op.batch_alter_table('water_bodies', schema=None) as batch_op:
        batch_op.alter_column('is_demonstration_data', ...)
```

### Running the Adoption Step:
```bash
cd backend
python -m alembic upgrade head
```

### Verifying Adoption:
```bash
python -m alembic current
# Output: dfd0da3e179f (head)

python -m alembic check
# Output: No new upgrade operations detected.
```

**Stamp Note**: Never run `alembic stamp head` blindly. Only use `alembic upgrade head` which validates existing schema, aligns column constraints, and sets `alembic_version` safely without discarding records.

---

## 6. Migration Generation (Scenario 4)

When modifying SQLAlchemy models in `backend/app/models/`, generate a new migration revision:

```bash
cd backend

# Auto-generate a new revision based on model metadata changes:
python -m alembic revision --autogenerate -m "add_telemetry_station_code"
```

Inspect the generated file in `backend/alembic/versions/<revision_id>_add_telemetry_station_code.py` to ensure both `upgrade()` and `downgrade()` operations are correct.

---

## 7. Migration Operations Runbook

All commands must be executed with working directory `backend/`:

| Goal | Command |
|---|---|
| Apply latest migrations | `python -m alembic upgrade head` |
| View current database revision | `python -m alembic current` |
| Inspect revision history | `python -m alembic history --verbose` |
| Verify schema drift vs models | `python -m alembic check` |
| Revert one migration step | `python -m alembic downgrade -1` |
| Rollback to clean state | `python -m alembic downgrade base` |

---

## 8. Data-Preservation Guarantees & Constraints

| Table | Data Preserved During Migration | Verification Mechanism |
|---|---|---|
| `water_bodies` | 100% of rows, IDs, coordinates, risk scores, and telemetry metadata | Verified via primary key & column equality checks |
| `alerts` | 100% of advisory records, timestamps, and severity classifications | Verified via foreign key relation check |
| `alert_deliveries` | 100% of persistent audit logs, provider responses, and channel records | Verified via record count and delivery ID check |

### Preservation Limits
- SQLite column drop or type alter requires table recreation under batch mode. During batch alter, temporary tables are created, data is copied, and the temporary table is renamed.
- Foreign key constraints must remain valid during copy operations.
- Destructive operations (such as `downgrade base`) will remove tracking versions and revert constraints. Destructive testing should **only** be executed on disposable test databases.

---

## 9. Running Automated Migration Tests

A dedicated test suite in `backend/tests/test_migrations.py` executes against temporary, disposable SQLite databases:

```bash
cd backend
pytest tests/test_migrations.py -v
```

### Test Scenarios Covered:
1. `test_fresh_database_migration`: Fresh install creates all tables, indexes, and enables application read/write.
2. `test_existing_legacy_database_adoption_and_data_preservation`: Pre-Alembic database is upgraded with 0 data loss.
3. `test_repeated_upgrade_is_idempotent_and_safe`: Running `upgrade head` repeatedly is safe with zero side effects.
4. `test_downgrade_and_rollback_on_disposable_database`: Verifies forward and backward schema traversal.
5. `test_schema_integrity_constraints_and_foreign_keys`: Validates nullability, primary keys, and foreign keys.
6. `test_migration_failure_does_not_silently_mark_success`: Verifies failed operations rollback cleanly without updating `alembic_version`.
7. `test_subsequent_schema_migration_lifecycle`: Verifies child migrations are tracked in `alembic_version`.

---

## 10. Troubleshooting Common Issues

### Issue 1: "sqlite3.OperationalError: table water_bodies already exists"
- **Cause**: Attempting to run a standard `create_table` migration on a pre-existing SQLite database that was initialized without Alembic.
- **Solution**: The AQUORA baseline migration uses `inspector.get_table_names()` to detect existing tables and conditionally switches to `batch_alter_table` alignment. Run `python -m alembic upgrade head` to adopt the table.

### Issue 2: "Target database is not up to date"
- **Cause**: `alembic check` was executed against an unstamped or un-migrated database.
- **Solution**: Run `python -m alembic upgrade head` before running `alembic check`.

### Issue 3: Duplicate SQLite database file created (`aquora.db` in root vs `backend/`)
- **Cause**: Migration or server command executed from an unexpected working directory with a relative path.
- **Solution**: Both `backend/app/core/config.py` and `backend/alembic/env.py` resolve the database URL as an absolute path pointing to `backend/aquora.db`. Always execute Alembic commands from `backend/`.

### Issue 4: "alembic : The term 'alembic' is not recognized"
- **Cause**: The global shell PATH does not include Python's `Scripts/` directory.
- **Solution**: Invoke Alembic directly via Python: `python -m alembic <command>`.
