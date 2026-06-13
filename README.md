# VoyageAtlas

VoyageAtlas는 사용자의 여행 기록을 3D 지구본 위에서 가장 아름답고 직관적으로 표현하기 위한 여행 아카이브 앱입니다.

여행을 `Odyssey` 단위로 등록하고, 도시 간 이동 경로와 사진, 영상, 파노라마 미디어를 하나의 지구본 경험으로 다시 볼 수 있습니다. 핵심 목표는 두 가지입니다.

- 여행 등록의 마찰을 줄인다.
- 등록된 여정을 지구 위에서 살아 움직이는 이야기처럼 보여준다.

## Highlights

- **3D Globe Journey View**  
  `react-globe.gl`와 Three.js 기반의 3D 지구본에서 방문 도시, 이동 경로, 항공/선박/지상 이동 아크를 시각화합니다.

- **Animated Playback**  
  여행 구간을 재생하면 항공기/Starship/선박/기차/차량 등 선택한 이동체가 경로를 따라 움직이고, HUD와 카메라가 현재 여정에 맞춰 반응합니다.

- **Odyssey Trip Management**  
  여행을 Trip 단위로 만들고, 여러 도시/구간을 한 번에 구성하며, 대시보드와 Journey Log에서 세부 기록을 관리합니다.

- **Media Archive**  
  사진, 영상, 360도 파노라마 이미지를 이벤트에 업로드하고 여행지별 갤러리로 감상할 수 있습니다. MinIO 기반 S3 호환 스토리지를 사용합니다.

- **Simulation Export**  
  현재 필터링된 여정을 글로브 재생 영상으로 기록하고 다운로드할 수 있습니다. Globe/Aerial 시점과 속도를 조절할 수 있습니다.

- **Recommendation Layer**  
  아직 가보지 않은 세계 주요 도시와 휴양지를 지구본 위에 별도 마커로 표시합니다. `Global Top N` 또는 `Country Top N` 기준으로 추천지 수를 조절할 수 있습니다.

- **Import / Export & Data Tools**  
  CSV 기반 여행 데이터 가져오기/내보내기와 데이터 관리 패널을 제공합니다.

## Product Direction

VoyageAtlas의 중심은 대시보드가 아니라 지구본입니다. 기능을 추가할 때는 항상 다음 질문을 기준으로 판단합니다.

- 이 기능이 사용자의 여행을 지구본에서 더 잘 보이게 하는가?
- 이 기능이 사용자가 여행을 더 쉽게 기록하게 하는가?

현재 UI는 우주선 관제실 같은 어두운 HUD, 세밀한 글로브 레이어, 이동 경로 재생 컨트롤을 중심으로 구성되어 있습니다.

## Current Feature Map

### Globe & Playback

- 방문 도시 라벨과 홀로그램 링
- 이동 경로 아크 및 교통수단별 스타일
- 재생/일시정지/구간 이동/속도 변경
- 자동 추적 카메라와 자유 카메라 전환
- Starship 전용 텔레메트리 HUD
- 글로브 테마, 경로 스타일, 마커 스타일 설정
- 추천 여행지 레이어 ON/OFF
- 추천 여행지 표시 방식:
  - `Global Top`: 전세계 방문 통계 기반 상위 N개
  - `Country Top`: 나라/지역별 상위 N개

### Trip & Event Management

- Odyssey 생성 모달
- 여러 구간을 포함한 여행 일정 입력
- Journey Log에서 이벤트/여행 관리
- Trip Dashboard에서 여행 상세 확인
- Calendar view
- Continent statistics

### Media

- 이벤트별 미디어 업로드
- 사진/영상 갤러리
- 360도 파노라마 뷰어
- EXIF/GPS 기반 미디어 분석 준비
- MinIO S3 호환 저장소

### Data & Export

- CSV import/export
- 데이터 관리 패널
- 필터링된 여정 범위만 시뮬레이션 export
- 생성된 영상 다운로드 및 재기록

## Development History Summary

최근 커밋 흐름 기준으로 프로젝트는 다음 단계로 발전했습니다.

1. 초기 FastAPI 백엔드, SQLite 모델, React/Vite 프론트엔드, Docker 인프라 구성
2. 여행 이벤트와 Odyssey 생성/관리 UI 구현
3. 3D 지구본 기반 여행 경로 시각화 추가
4. Trip Dashboard, EventManager, MediaCarousel, PanoramaViewer 등 여행 기록 관리 화면 확장
5. CSV import/export와 데이터 관리 모달 추가
6. 글로브 HUD, Journey Inspector, 필터링된 재생 범위 개선
7. 시뮬레이션 export 기능과 다운로드 안정화
8. Starship/교통수단별 이동체 시각화와 글로브 테마 설정 강화
9. 추천 여행지 레이어, 전세계/나라별 Top N 필터, 한글/영문 추천 라벨 추가

## Architecture

```text
Docker Stack
├── Frontend  React / Vite   -> localhost:3333  (container: 5173)
├── Backend   FastAPI        -> localhost:8888  (container: 8000)
└── MinIO     S3-compatible  -> localhost:9999  (console: 9991)
```

### Data Flow

```text
App.jsx
├── GET /api/events/       -> flat TravelEvent list -> TravelGlobe arcs
└── GET /api/events/trips  -> grouped Trip data     -> Dashboard / Manager
```

## Tech Stack

### Frontend

- React 18
- Vite
- react-globe.gl
- Three.js
- lucide-react
- photo-sphere-viewer
- Axios

### Backend

- FastAPI
- SQLAlchemy / SQLModel
- SQLite
- pandas / openpyxl
- boto3
- Pillow / EXIF utilities
- geopy / requests

### Infrastructure

- Docker Compose
- MinIO object storage

## Getting Started

### Requirements

- Docker
- Docker Compose

Docker Desktop을 설치한 뒤 실행 중인 상태에서 아래 명령을 사용하세요.

### Easiest Start

Windows PowerShell:

```powershell
.\scripts\start.ps1
```

macOS / Linux:

```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

이 스크립트는 `docker compose up -d --build`를 실행하고 접속 URL을 출력합니다.

이미 빌드가 끝난 뒤 빠르게 다시 켜고 싶다면:

```powershell
.\scripts\start.ps1 -NoBuild
```

```bash
./scripts/start.sh --no-build
```

### Manual Docker Run

```bash
docker-compose up -d --build
```

Services:

- Frontend: [http://localhost:3333](http://localhost:3333)
- Backend API docs: [http://localhost:8888/docs](http://localhost:8888/docs)
- MinIO console: [http://localhost:9991](http://localhost:9991)
  - ID: `minioadmin`
  - Password: `minioadmin`

### Check That It Works

1. Open [http://localhost:3333](http://localhost:3333).
2. The 3D globe should appear with HUD panels on the left and right.
3. Open [http://localhost:8888/docs](http://localhost:8888/docs).
4. FastAPI Swagger docs should load.
5. Open [http://localhost:9991](http://localhost:9991) and log in with `minioadmin / minioadmin`.
6. If the frontend loads but data does not appear, check backend logs:

```bash
docker compose logs -f backend
```

### Stop The App

```bash
docker compose down
```

To remove MinIO media data as well, delete the Docker volume manually. Do this only when you intentionally want a clean local reset.

### Frontend Only

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 3333
```

### Production Build Check

```bash
cd frontend
npm run build
```

## How To Use VoyageAtlas

### 1. Record A Trip

1. Click `ADD TRAVEL`.
2. Enter the Odyssey name and the route stops.
3. Add departure/arrival dates and transport type.
4. Save the trip.
5. The new route appears on the globe and in the Journey Log.

### 2. Explore The Globe

- Use the playback bar at the bottom to replay the selected route.
- Use speed control to change playback speed.
- Use vehicle control to switch between plane, Starship, ship, train, ground vehicle, and other visual modes.
- Use `AUTO` / free camera mode to either follow the route or orbit manually.

### 3. Filter A Journey

The left Journey Scope panel lets you filter visible legs by date and place. Simulation export uses the currently visible scope, so you can export a full journey or only a filtered part of it.

### 4. Show Recommended Places

1. Open `GLOBE THEME` from the right-side HUD.
2. Turn `Life list signals` on or off.
3. Choose a recommendation mode:
   - `Global Top`: show the top N places globally, ordered first by international visitor statistics.
   - `Country Top`: show top N places per country/region. This is useful when zooming into Japan, Europe, Southeast Asia, etc.
4. Move the slider to control how many recommendation markers appear.

Recommendation labels use Korean and English together, such as `오사카 / Osaka`.

### 5. Upload Media

Open a trip or event from the Journey Log or Dashboard, then upload photos, videos, or panorama images. Media files are stored in MinIO and linked to the selected travel event.

### 6. Export A Simulation Video

1. Use filters if you want only part of the journey.
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

### Docker Services Started But Frontend Shows Backend Error

Check backend logs:

```bash
docker compose logs -f backend
```

Then check whether the API docs open:

```text
http://localhost:8888/docs
```

### Media Does Not Load

Confirm MinIO is running:

```bash
docker compose logs -f minio
```

Confirm `MEDIA_PUBLIC_URL` in `docker-compose.yml` points to:

```text
http://localhost:9999
```

### Clean Rebuild

```bash
docker compose down
docker compose up -d --build
```

### Frontend Build Warning

`npm run build` may warn that some chunks are larger than 500 kB. This project uses Three.js and globe rendering libraries, so that warning is expected unless code splitting is introduced.

## Project Structure

```text
VoyageAtlas/
├── backend/
│   ├── api/                 # FastAPI routers
│   ├── utils/               # geocoder, media analysis, clustering helpers
│   ├── main.py              # startup, migrations, storage init
│   ├── models.py            # Trip / TravelEvent / Media models
│   └── database.py
├── frontend/
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # globe, HUD, modals, dashboards, media UI
│   │   ├── config/          # globe themes, world recommendation data
│   │   ├── hooks/           # simulation recorder
│   │   └── utils/           # flight physics, globe helpers
│   ├── public/
│   └── package.json
├── docker-compose.yml
└── README.md
```

## API Overview

Frontend requests use the `/api` prefix.

```text
GET    /api/events/
GET    /api/events/trips
POST   /api/events/
PUT    /api/events/{id}
DELETE /api/events/{id}
POST   /api/events/{id}/media
DELETE /api/events/{id}/media/{media_id}
GET    /api/geocode
POST   /api/import/csv
GET    /api/export/csv
```

## Development Notes

- `API_BASE`는 `frontend/src/api/client.js`에서만 관리합니다.
- 글로브 렌더링은 `TravelGlobe.jsx`와 `flightPhysics.js`가 중심입니다.
- 추천 여행지 데이터는 `frontend/src/config/worldHighlights.js`에 있습니다.
- 추천 여행지 필터링/정렬은 `frontend/src/utils/worldHighlightLayer.js`에서 처리합니다.
- 미디어 URL은 브라우저 접근용 `MEDIA_PUBLIC_URL=http://localhost:9999` 기준으로 저장됩니다.
- 개발 환경의 SQLite DB는 스키마 변화에 따라 재생성될 수 있으므로, 중요한 데이터는 export 후 작업하는 것이 안전합니다.
