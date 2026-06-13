# VoyageAtlas 설치/실행 가이드

[README로 돌아가기](../README.md) · [English](SETUP.en.md)

이 문서는 VoyageAtlas를 로컬에서 실행하고, 정상 동작을 확인하고, 자주 생기는 문제를 해결하기 위한 가이드입니다.

## 요구사항

- Docker Desktop
- Docker Compose

Docker Desktop이 실행 중인지 먼저 확인하세요.

## 가장 쉬운 실행 방법

Windows PowerShell:

```powershell
.\scripts\start.ps1
```

macOS / Linux:

```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

스크립트는 내부적으로 `docker compose up -d --build`를 실행하고 접속 URL을 출력합니다.

이미 빌드가 끝난 뒤 빠르게 다시 켜고 싶다면:

```powershell
.\scripts\start.ps1 -NoBuild
```

```bash
./scripts/start.sh --no-build
```

## 수동 실행

```bash
docker compose up -d --build
```

서비스 주소:

- 프론트엔드: [http://localhost:3333](http://localhost:3333)
- 백엔드 API 문서: [http://localhost:8888/docs](http://localhost:8888/docs)
- MinIO 콘솔: [http://localhost:9991](http://localhost:9991)
  - ID: `minioadmin`
  - Password: `minioadmin`

## 정상 실행 확인

1. [http://localhost:3333](http://localhost:3333)을 엽니다.
2. 좌우 HUD 패널과 3D 지구본이 보이면 프론트엔드가 정상입니다.
3. [http://localhost:8888/docs](http://localhost:8888/docs)를 엽니다.
4. FastAPI Swagger 문서가 보이면 백엔드가 정상입니다.
5. [http://localhost:9991](http://localhost:9991)에 접속해 `minioadmin / minioadmin`으로 로그인합니다.
6. 프론트엔드는 뜨지만 데이터가 보이지 않으면 백엔드 로그를 확인합니다.

```bash
docker compose logs -f backend
```

## 앱 중지

```bash
docker compose down
```

MinIO 미디어 데이터까지 삭제하려면 Docker volume을 직접 삭제해야 합니다. 로컬 데이터를 완전히 초기화하려는 경우에만 수행하세요.

## 프론트엔드만 실행

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 3333
```

## 프로덕션 빌드 확인

```bash
cd frontend
npm run build
```

`npm run build` 실행 시 일부 chunk가 500 kB보다 크다는 경고가 나올 수 있습니다. 이 프로젝트는 Three.js와 지구본 렌더링 라이브러리를 사용하므로, 코드 스플리팅을 추가하기 전까지는 예상 가능한 경고입니다.

## 주요 사용법

### 여행 기록하기

1. `ADD TRAVEL`을 클릭합니다.
2. Odyssey 이름과 이동 경로를 입력합니다.
3. 출발/도착 날짜와 교통수단을 입력합니다.
4. 저장합니다.
5. 새 경로가 지구본과 Journey Log에 표시됩니다.

### 지구본 탐색하기

- 하단 재생바로 선택된 경로를 다시 볼 수 있습니다.
- 속도 컨트롤로 재생 속도를 조절합니다.
- 차량 컨트롤로 Plane, Starship, Ship, Train, Ground 등 이동체를 바꿀 수 있습니다.
- `AUTO` 또는 자유 카메라 모드로 경로 자동 추적과 수동 회전을 전환합니다.

### 추천 여행지 표시하기

1. 오른쪽 HUD에서 `GLOBE THEME`을 엽니다.
2. `Life list signals`를 켜거나 끕니다.
3. 추천 방식 선택:
   - `Global Top`: 국제 방문 통계 기준으로 전세계 상위 N개 표시
   - `Country Top`: 나라/지역별 상위 N개 표시
4. 슬라이더를 움직여 추천 마커 개수를 조절합니다.

추천 라벨은 `오사카 / Osaka`처럼 한글과 영어를 함께 표시합니다.

### 시뮬레이션 영상 내보내기

1. 일부 여정만 내보내고 싶다면 먼저 필터를 적용합니다.
2. 시뮬레이션 export 패널에서 `Globe` 또는 `Aerial` 시점을 선택합니다.
3. `Record`를 클릭합니다.
4. 녹화가 끝날 때까지 기다립니다.
5. 생성된 영상을 다운로드합니다.

## 문제 해결

### 포트가 이미 사용 중인 경우

VoyageAtlas는 다음 포트를 사용합니다.

- 프론트엔드: `3333`
- 백엔드: `8888`
- MinIO API: `9999`
- MinIO 콘솔: `9991`

포트가 이미 사용 중이면 다른 프로세스를 종료하거나 `docker-compose.yml`의 포트 매핑을 변경하세요.

### Docker 서비스는 켜졌지만 프론트엔드에 백엔드 오류가 보이는 경우

```bash
docker compose logs -f backend
```

API 문서가 열리는지도 확인합니다.

```text
http://localhost:8888/docs
```

### 미디어가 보이지 않는 경우

```bash
docker compose logs -f minio
```

`docker-compose.yml`의 `MEDIA_PUBLIC_URL`이 다음 주소를 가리키는지 확인합니다.

```text
http://localhost:9999
```

### 깨끗하게 다시 빌드하기

```bash
docker compose down
docker compose up -d --build
```
