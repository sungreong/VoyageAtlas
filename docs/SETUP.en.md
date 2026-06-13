# VoyageAtlas Setup Guide

[Back to README](../README.en.md) · [한국어](SETUP.ko.md)

This guide explains how to run VoyageAtlas locally, verify that it works, and troubleshoot common issues.

## Requirements

- Docker Desktop
- Docker Compose

Make sure Docker Desktop is running before starting the app.

## Easiest Start

Windows PowerShell:

```powershell
.\scripts\start.ps1
```

macOS / Linux:

```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

The script runs `docker compose up -d --build` and prints the local service URLs.

If the images are already built and you only want to restart quickly:

```powershell
.\scripts\start.ps1 -NoBuild
```

```bash
./scripts/start.sh --no-build
```

## Manual Docker Run

```bash
docker compose up -d --build
```

Services:

- Frontend: [http://localhost:3333](http://localhost:3333)
- Backend API docs: [http://localhost:8888/docs](http://localhost:8888/docs)
- MinIO console: [http://localhost:9991](http://localhost:9991)
  - ID: `minioadmin`
  - Password: `minioadmin`

## Check That It Works

1. Open [http://localhost:3333](http://localhost:3333).
2. The 3D globe should appear with HUD panels on the left and right.
3. Open [http://localhost:8888/docs](http://localhost:8888/docs).
4. FastAPI Swagger docs should load.
5. Open [http://localhost:9991](http://localhost:9991) and log in with `minioadmin / minioadmin`.
6. If the frontend loads but data does not appear, check backend logs.

```bash
docker compose logs -f backend
```

## Stop The App

```bash
docker compose down
```

To remove MinIO media data as well, delete the Docker volume manually. Only do this when you intentionally want a clean local reset.

## Frontend Only

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 3333
```

## Production Build Check

```bash
cd frontend
npm run build
```

`npm run build` may warn that some chunks are larger than 500 kB. This project uses Three.js and globe rendering libraries, so the warning is expected unless code splitting is introduced.

## Main Usage

### Record A Trip

1. Click `ADD TRAVEL`.
2. Enter the Odyssey name and route stops.
3. Add departure/arrival dates and transport type.
4. Save the trip.
5. The new route appears on the globe and in the Journey Log.

### Explore The Globe

- Use the bottom playback bar to replay the selected route.
- Use the speed control to change playback speed.
- Use the vehicle control to switch between Plane, Starship, Ship, Train, Ground, and other visual modes.
- Use `AUTO` or free camera mode to switch between route follow and manual orbit.

### Show Recommended Places

1. Open `GLOBE THEME` from the right-side HUD.
2. Turn `Life list signals` on or off.
3. Choose a recommendation mode:
   - `Global Top`: show the top N places globally, ordered first by international visitor statistics.
   - `Country Top`: show top N places per country/region.
4. Move the slider to control how many recommendation markers appear.

Recommendation labels use Korean and English together, such as `오사카 / Osaka`.

### Export A Simulation Video

1. Apply filters first if you only want part of the journey.
2. Choose `Globe` or `Aerial` in the simulation export panel.
3. Click `Record`.
4. Wait for the recording to finish.
5. Download the generated video.

## Troubleshooting

### Port Already In Use

VoyageAtlas expects these host ports:

- Frontend: `3333`
- Backend: `8888`
- MinIO API: `9999`
- MinIO Console: `9991`

If one is already occupied, stop the other process or change the port mapping in `docker-compose.yml`.

### Docker Services Started But Frontend Shows A Backend Error

```bash
docker compose logs -f backend
```

Then check whether the API docs open:

```text
http://localhost:8888/docs
```

### Media Does Not Load

```bash
docker compose logs -f minio
```

Confirm that `MEDIA_PUBLIC_URL` in `docker-compose.yml` points to:

```text
http://localhost:9999
```

### Clean Rebuild

```bash
docker compose down
docker compose up -d --build
```
