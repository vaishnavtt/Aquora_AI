# AQUORA AI — Frontend

A water-intelligence dashboard for monitoring hydrological risk, powered by Google Maps and the AQUORA FastAPI backend.

## Quick Start

```bash
# From the Aquora_AI/ root
cd frontend
npm install
npm run dev      # Vite dev server at http://localhost:5173
```

## Environment Variables

Copy the project `.env.example` to `.env` (at the `Aquora_AI/` root, not inside `frontend/`):

```bash
cp .env.example .env
```

Then edit `.env` and fill in the required values:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend URL, e.g. `http://localhost:8000/api/v1` |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes (for live map) | Google Maps JavaScript API key |
| `VITE_MAPBOX_TOKEN` | Optional | Mapbox token (not used in current build) |

> **Important:** Never commit `.env`. It is already listed in `.gitignore`.

## Google Maps API Key Setup

The live map requires a Google Maps JavaScript API key. Without it, the map section shows a setup-instructions panel — the rest of the dashboard still works.

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create or select a project
3. Navigate to **APIs & Services → Library**
4. Enable **Maps JavaScript API**
5. Go to **APIs & Services → Credentials → Create Credentials → API Key**
6. Restrict the key to **Maps JavaScript API** and your domain(s)
7. Add to your `.env`:

```
VITE_GOOGLE_MAPS_API_KEY=AIza...your_key_here
```

8. Restart the Vite dev server after updating `.env`.

## Build & Test

```bash
# Type check + production bundle
npm run build

# Run Vitest unit tests
npm test

# Preview production build
npm run preview
```

## Project Structure

```
frontend/src/
├── components/
│   ├── common/         DemoBadge, RiskLegend, RiskBadge, GaugeRing
│   ├── layout/         BottomSheet (mobile)
│   ├── map/            GoogleMapComponent, MapMarker
│   └── *.tsx           Dashboard, sidebar, panels, charts
├── hooks/
│   ├── useWaterBodies.ts
│   ├── useSelectedWaterBody.ts
│   └── useMapMarkers.ts
├── services/
│   └── api.ts          All backend API calls (single source of truth)
└── types/
    └── index.ts        TypeScript interfaces matching docs/api-contract.md
```

## DEMO DATA

When the backend is unreachable or water body records have `is_demonstration_data: true`, all affected cards, charts, and the detail panel display a **DEMO DATA** badge (amber background). This data is synthetic and not validated against real sensor readings.

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | System health status |
| `GET /water-bodies` | All monitored stations (map markers) |
| `GET /water-bodies/{id}` | Single station detail |
| `GET /water-bodies/by-coordinates` | Coordinate lookup on map click |
| `GET /dashboard` | KPI aggregates |
| `POST /predict` | Risk prediction (What-If simulator) |
| `GET /environmental-data/{id}` | Pipeline audit for detail panel |

See [`docs/api-contract.md`](../docs/api-contract.md) for the full schema.
