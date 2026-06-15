# VoyageAtlas

[한국어](README.md) · [Setup Guide](docs/SETUP.en.md)

VoyageAtlas is a travel archive app designed to make personal travel history beautiful and intuitive on a 3D globe.

You can record trips as `Odyssey` entries, connect city-to-city routes, attach photos, videos, and panorama media, and replay the whole journey as a spatial story on Earth.

## Screenshots

### Main Globe

The globe stays central while route scope, playback, continent jump, simulation export, and secondary tools start in compact collapsed states.

![VoyageAtlas main globe](docs/screenshots/readme-main-globe.png)

### Simulation Playback

Replay filtered journeys on the globe and export them as Globe/Aerial simulation videos.

![VoyageAtlas simulation playback](docs/voyageatlas-simulation-2026-06-15T13-02-31-657Z.gif)

### Odyssey Creation

Create an Odyssey by entering the trip name, origin city, dates, and stop sequence.

![VoyageAtlas Odyssey creation](docs/screenshots/readme-create-odyssey.png)

### Journey Log

Review saved journeys, compare leg counts and distance, and jump into trip management.

![VoyageAtlas Journey Log](docs/screenshots/readme-journey-log.png)

### Globe Theme And Recommendations

Open `TOOLS`, then tune globe style, route shape, city markers, and recommended destination layers.

![VoyageAtlas globe theme settings](docs/screenshots/readme-globe-theme.png)

## Core Values

- Make travel logging feel effortless.
- Make recorded journeys feel alive on the globe.
- Prioritize the globe experience over feature clutter.

## Highlights

- **3D Globe Journey View**: Show visited cities, route arcs, and air/sea/ground travel paths on a 3D globe.
- **Animated Playback**: Replay journeys with aircraft, Starship, ship, train, ground vehicle, and other visual modes.
- **Odyssey Management**: Create multi-stop trips and manage them through the Journey Log and Dashboard.
- **Media Archive**: Attach photos, videos, and 360-degree panorama images to travel events.
- **Simulation Export**: Record filtered journeys as Globe/Aerial playback videos and download them.
- **Recommendation Layer**: Show unvisited major cities and resort destinations using `Global Top N` or `Country Top N`.
- **Data Tools**: Import/export CSV travel data and manage local records.

## Quick Start

Start Docker Desktop, then run:

```powershell
.\scripts\start.ps1
```

macOS / Linux:

```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

URLs:

- App: [http://localhost:3333](http://localhost:3333)
- API docs: [http://localhost:8888/docs](http://localhost:8888/docs)
- MinIO console: [http://localhost:9991](http://localhost:9991)

For installation details, verification steps, and troubleshooting, see the [Setup Guide](docs/SETUP.en.md).

## User Flow

1. Create an Odyssey with `ADD TRAVEL`.
2. Enter origin, destination, dates, and transport type.
3. Replay the route on the globe and adjust camera, speed, and vehicle mode.
4. Upload photos, videos, and panoramas from the Journey Log or Dashboard.
5. Open `TOOLS` only when you need Calendar, Manage, Portability, Stats, or `GLOBE THEME`.
6. Expand continent jump or simulation export only when needed so the globe stays spacious.
7. Filter the journey scope and export it as a simulation video.

## Architecture

```text
Docker Stack
├── Frontend  React / Vite   -> localhost:3333  (container: 5173)
├── Backend   FastAPI        -> localhost:8888  (container: 8000)
└── MinIO     S3-compatible  -> localhost:9999  (console: 9991)
```

## Tech Stack

- Frontend: React 18, Vite, react-globe.gl, Three.js, lucide-react, photo-sphere-viewer, Axios
- Backend: FastAPI, SQLAlchemy/SQLModel, SQLite, pandas, boto3, Pillow, geopy
- Infrastructure: Docker Compose, MinIO

## Project Structure

```text
VoyageAtlas/
├── backend/                 # FastAPI API, DB models, media/geocoding utilities
├── frontend/                # React app, globe UI, HUD, modals, destination data
├── docs/                    # Setup and run guides
├── scripts/                 # Local startup helpers
├── docker-compose.yml
└── README.md
```

## Development Notes

- `API_BASE` is managed only in `frontend/src/api/client.js`.
- Globe rendering centers around `frontend/src/components/TravelGlobe.jsx` and `frontend/src/utils/flightPhysics.js`.
- Recommended destination data lives in `frontend/src/config/worldHighlights.js`.
- Recommended destination filtering and sorting lives in `frontend/src/utils/worldHighlightLayer.js`.
- In development, SQLite data may be recreated when schema changes are detected. Export important data before risky local changes.

## License

This project is distributed under the [Apache License 2.0](LICENSE).
