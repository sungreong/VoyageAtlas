# VoyageAtlas — Agent Code Guide

## Mission
> **사용자의 여행 기록을 3D 지구본 위에서 가장 아름답고 직관적으로 표현한다.**

여행 등록의 마찰을 최소화하고, 등록된 여정이 지구 위에서 살아 숨쉬듯 표현되는 것이 이 앱의 핵심 가치다.
모든 기능 결정은 "지구본에서 더 잘 보이는가?" "더 쉽게 기록할 수 있는가?"를 기준으로 판단한다.

---

## 1. Architecture Overview

```
Docker Stack
├── Frontend  React/Vite    → localhost:3333  (internal 5173)
├── Backend   FastAPI/Py    → localhost:8888  (internal 8000)
└── MinIO     S3-compat     → localhost:9999  (API), 9991 (console)
```

### Domain Vocabulary
| App Term | Real Meaning | Where Used |
|---|---|---|
| Odyssey | Trip (여행) | `CreateOdysseyModal`, trip APIs |
| Journey Log | Event history list | `EventManager` |
| TravelEvent | One leg (from → to with coords) | globe arcs, API |

### Data Flow
```
App.jsx (root state)
  ├── GET /api/events/       → flat list  → TravelGlobe (arc rendering)
  └── GET /api/events/trips  → grouped   → TripDashboard
```

---

## 2. Code Quality Rules

### File Size Limit: 1000 lines max
Every file must stay under 1000 lines. When a file grows large, split by responsibility:

**Frontend split patterns:**
```
TravelGlobe.jsx (641 lines) — approaching limit
→ Extract: useGlobeAnimation.js   (playback loop, arc interpolation)
→ Extract: useFlightCamera.js     (camera tracking, free-cam toggle)
→ Extract: GlobeMarkers.jsx       (city markers, contrail particles)

CreateOdysseyModal.jsx (499 lines)
→ Extract: OdysseyFormFields.jsx  (basic trip fields)
→ Extract: ItineraryBuilder.jsx   (event list editing)

App.jsx (448 lines)
→ Extract: useAppState.js         (state declarations + reducers)
→ Extract: usePlayback.js         (flight animation loop)
```

**Backend split patterns:**
```
api/events.py (818 lines) — needs split
→ Extract: api/trips.py    (trip CRUD)
→ Extract: api/media.py    (upload, delete, presigned URLs)
→ api/events.py keeps TravelEvent CRUD only
```

### Module Rules
- Never declare `API_BASE` locally — import from `frontend/src/api/client.js`
- Never instantiate boto3 inline — call `get_s3_client()` from `events.py`
- Never duplicate media type logic — use `backend/utils/media_utils.py: get_media_type()`
- CSS: one `.css` file per component (already follows `ComponentName.css` pattern)

### State Management (App.jsx)
App.jsx owns all top-level state. Component props flow downward; events bubble up via callbacks.
Do not introduce a global store (Redux/Zustand) unless App.jsx exceeds 600 lines after extractions.

---

## 3. Globe Visualization — Core UX

The 3D globe (`TravelGlobe.jsx` + `flightPhysics.js`) is the product's identity. All globe work uses `react-globe.gl` over Three.js.

### Globe Rendering Layers (in render order)
| Layer | Component/Data | Purpose |
|---|---|---|
| Globe surface | react-globe.gl | Base map, atmosphere |
| City markers | `customThreeObject` | Hologram rings at visited cities |
| Flight arcs | `arcsData` | Great-circle paths between events |
| Aircraft | `customLayerData` | Animated plane at current position |
| Contrails | particle array (max 60) | Trail behind aircraft |
| Sun lighting | `showAtmosphere` + position calc | Real-time sun position |

### Globe Performance Rules
- Contrail particles: **hard cap at 60**. Drop oldest when adding new.
- Arc re-render: throttle to 16ms (one frame). Recalculate only when `events` array changes reference.
- Camera animation: use `ref.current.pointOfView()` — never manipulate Three.js camera directly.
- Aircraft SVG: keep under 150×150px. Complex SVG = GPU overdraw on mobile.

### Globe → Event Registration Flow (Critical UX Path)
```
User clicks globe point
  → App.jsx: setSelectedCoords({ lat, lng })
  → Reverse geocode via /api/geocode
  → SimpleEventForm opens pre-filled with city name
  → User confirms → POST /api/events/
  → Globe re-fetches and animates new arc
```
This path must feel instant. Geocoding is async — show a spinner on the marker, not a blocking modal.

### Flight Playback
- Default duration per segment: 5 seconds (`FLIGHT_DURATION_MS = 5000` in App.jsx)
- Speed multiplier: 0.5× / 1× / 2× / 4×
- Free-camera mode: disables auto-follow, user can orbit freely
- `flightPhysics.js` exports: `getAircraftPosition(t, fromCoord, toCoord)`, `getBankAngle(t)`, `getPitchAngle(t)`

---

## 4. Event Registration UX

Registering a travel event is the second most important interaction after globe viewing.

### Registration Entry Points
1. **Globe click** → `SimpleEventForm` (minimal, pre-filled coords)
2. **"+" button in EventManager** → full `EventForm`
3. **CSV import** → `ExportImportModal` (bulk)
4. **Media upload auto-detect** → EXIF GPS → auto-creates event

### Form UX Priorities
- From/To city fields must have autocomplete (geocoder-backed).
- Date/time picker must default to "now" for the departure field.
- Transport type selector: show icons, not a plain `<select>`.
- Validation errors inline, never blocking alert().

### Media Upload Intelligence
When a photo/video is uploaded to an event:
1. EXIF GPS extracted (`media_analyzer.py`)
2. If GPS city ≠ event city → auto-create a new TravelEvent for that city
3. Show user a non-blocking toast: "📍 New stop detected: [City]. Added to your journey."

Do not block the upload flow — auto-create runs after the upload resolves.

---

## 5. Design & UX Skills

When improving UI/UX, use the following Claude Code skills. Each skill is purpose-specific:

### Globe & Visualization
| Task | Skill | When to Use |
|---|---|---|
| Globe feels static/lifeless | `/animate` | Add arc draw animations, aircraft entrance, city pulse |
| Globe markers hard to read | `/arrange` | Improve marker size hierarchy, z-index layering |
| Globe color palette dull | `/colorize` | Arc gradient colors by transport type, atmosphere tint |
| Globe too visually noisy | `/distill` | Remove redundant markers, simplify arc styles |

### Event Registration Forms
| Task | Skill | When to Use |
|---|---|---|
| Form feels cluttered | `/arrange` | Field grouping, spacing, visual rhythm |
| Form copy confusing | `/clarify` | Labels, placeholders, error messages |
| Form lacks personality | `/delight` | Micro-interactions on submit, success states |
| Form too complex | `/distill` | Progressive disclosure, hide advanced fields |

### Dashboards & Panels
| Task | Skill | When to Use |
|---|---|---|
| TripDashboard feels generic | `/bolder` | Stronger visual identity, typographic hierarchy |
| MediaCarousel too plain | `/colorize` | Overlay gradients, caption styling |
| Overall app audit | `/audit` | Accessibility, performance, responsive checks |
| Component extraction | `/extract` | Pull reusable tokens, shared patterns |

### Responsive & Accessibility
| Task | Skill | When to Use |
|---|---|---|
| Mobile globe unusable | `/adapt` | Touch targets, breakpoints, viewport fit |
| Text contrast issues | `/audit` | WCAG AA check across all panels |

### Skill Usage in Practice
```
# To improve globe animation feel:
/animate

# To clean up CreateOdysseyModal form layout:
/arrange

# To make the app feel premium and polished:
/polish

# Full UX audit before a milestone:
/audit
```

Always describe the specific component context when invoking a skill so it applies changes to the right files.

---

## 6. API Contract

### Frontend → Backend
All requests use `/api` prefix. Vite proxy strips `/api` → forwards to `http://backend:8000`.

```
GET  /api/events/              flat TravelEvent list (globe arcs)
GET  /api/events/trips         grouped Trip→Event hierarchy (dashboard)
POST /api/events/              create TravelEvent
PUT  /api/events/{id}          update TravelEvent
DEL  /api/events/{id}          delete TravelEvent
POST /api/events/{id}/media    upload media file
DEL  /api/events/{id}/media/{media_id}
GET  /api/geocode?q={query}    city search / reverse geocode
POST /api/trips/               create Trip (Odyssey)
PUT  /api/trips/{id}
DEL  /api/trips/{id}
POST /api/import/csv           bulk import
GET  /api/export/csv           bulk export
```

### Error Handling
- 4xx: show inline validation message (never alert())
- 5xx: show dismissible toast with retry button
- Network timeout: globe continues playing; queue the failed request for retry

---

## 7. Key Files Reference

### Frontend
| File | Lines | Role |
|---|---|---|
| `frontend/src/App.jsx` | 448 | Root state, playback loop, modal orchestration |
| `frontend/src/components/TravelGlobe.jsx` | 641 | 3D globe: arcs, aircraft, contrails, camera |
| `frontend/src/utils/flightPhysics.js` | 341 | Aircraft position/angle math |
| `frontend/src/components/CreateOdysseyModal.jsx` | 499 | Trip creation form |
| `frontend/src/components/TripDashboard.jsx` | 348 | Trip detail panel |
| `frontend/src/components/ExportImportModal.jsx` | 435 | Data import/export |
| `frontend/src/components/MediaCarousel.jsx` | 320 | Photo/video gallery |
| `frontend/src/api/client.js` | — | `API_BASE` + axios instance (single source of truth) |

### Backend
| File | Lines | Role |
|---|---|---|
| `backend/main.py` | 59 | FastAPI startup: schema check → migrate → init MinIO |
| `backend/api/events.py` | 818 | All event/trip/media endpoints + `get_s3_client()` |
| `backend/utils/media_utils.py` | 8 | `get_media_type(filename)` — never duplicate |
| `backend/utils/media_analyzer.py` | 137 | EXIF + Nominatim reverse geocode |
| `backend/utils/clustering.py` | 85 | Suggest event groupings from bulk data |
| `backend/init_storage.py` | 31 | MinIO bucket init (called once at startup) |
| `backend/models.py` | 57 | SQLAlchemy: Trip, TravelEvent, EventMedia, TripPreparation |

---

## 8. Infrastructure Notes

### MinIO Media URLs
- DB stores URLs with `MEDIA_PUBLIC_URL` prefix (= `http://localhost:9999`)
- Backend → MinIO: `http://minio:9000` (internal Docker network)
- Browser → MinIO: `http://localhost:9999` (exposed port)

### DB Auto-Reset (Dev Only)
`main.py` checks for `cost`/`note` columns on startup.
Missing → deletes `voyage.db` → recreates fresh.
**Do not rely on existing data surviving a restart in dev.**

### Startup Order
1. MinIO starts → bucket created (`init_storage.py: init_minio()`)
2. Backend starts → schema check → migrate
3. Frontend starts → fetches `/api/events/` and `/api/events/trips` in parallel

---

## 9. Development Workflow

### Adding a New Feature
1. Identify which layer it touches: globe rendering / event registration / dashboard / media
2. Check if the target file is approaching 1000 lines — extract first if needed
3. For any visual change, run the appropriate skill (`/animate`, `/arrange`, etc.)
4. Test the globe playback end-to-end after any change to `App.jsx` or `TravelGlobe.jsx`
5. Verify mobile layout with `/adapt` if adding new UI panels

### Globe-First Development
When in doubt about where a feature belongs, ask:
> "Does this help the user see their journey on the globe, or register a new journey faster?"

If yes → prioritize. If no → defer or skip.

### Commit Scope
- Globe rendering changes: keep separate from form/dashboard changes
- Backend API changes: always paired with frontend consumer update in same commit
- CSS changes: one component per commit unless it's a design-system token change
