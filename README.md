# VoyageAtlas 🌍✈️

VoyageAtlas는 여행 기록을 3D 지구본 위에서 시각화하고 관리할 수 있는 웹 애플리케이션입니다.

여행 경로(이벤트)를 기록하고, 각 여행지에서의 사진, 파노라마 이미지, 비디오 등 다양한 미디어를 직관적으로 관리할 수 있습니다.

## ✨ 주요 기능

*   **여행 경로 시각화**: `react-globe.gl`을 활용하여 3D 지구본 위에 여행 경로와 이벤트를 시각화합니다.
*   **여행 일정 관리**: 여행(Trip) 단위로 이벤트를 그룹화하여 관리합니다.
*   **미디어 갤러리**: 여행지에서 찍은 일반 사진, 360도 파노라마 이미지, 비디오를 업로드하고 감상할 수 있습니다.
*   **Docker 기반 배포**: Frontend, Backend, MinIO(Object Storage)가 Docker Compose로 구성되어 있어 쉽게 배포하고 실행할 수 있습니다.

## 🛠️ 기술 스택 (Tech Stack)

### Frontend
*   **Framework**: React (Vite)
*   **Visualization**: react-globe.gl, three.js
*   **Media**: photo-sphere-viewer (파노라마 뷰어)
*   **Language**: JavaScript / JSX

### Backend
*   **Framework**: FastAPI (Python)
*   **Database**: SQLite (SQLModel/SQLAlchemy)
*   **Object Storage**: MinIO (S3 Compatible) - 미디어 파일 저장
*   **Libraries**: pandas, boto3

### Infrastructure
*   **Docker & Docker Compose**: 컨테이너 기반의 통합 개발 및 배포 환경

## 🚀 시작하기 (Getting Started)

이 프로젝트는 Docker Compose를 기반으로 실행되도록 구성되어 있습니다.

### 사전 요구사항 (Prerequisites)
*   [Docker](https://www.docker.com/) 및 Docker Compose가 설치되어 있어야 합니다.

### 실행 방법 (Installation & Run)

1.  **저장소 클론**
    ```bash
    git clone <repository-url>
    cd VoyageAtlas
    ```

2.  **Docker 컨테이너 실행**
    ```bash
    docker-compose up -d --build
    ```
    *   최초 실행 시 이미지를 빌드하고 의존성을 설치하느라 시간이 소요될 수 있습니다.

3.  **서비스 접속**
    *   **Frontend**: [http://localhost:3333](http://localhost:3333)
    *   **Backend API Docs**: [http://localhost:8888/docs](http://localhost:8888/docs)
    *   **MinIO Console**: [http://localhost:9991](http://localhost:9991) (ID/PW: `minioadmin` / `minioadmin`)

## 📂 프로젝트 구조 (Project Structure)

```
VoyageAtlas/
├── backend/                # FastAPI 백엔드
│   ├── api/                # API 라우터 (events, importer 등)
│   ├── utils/              # 유틸리티 (geocoder 등)
│   ├── main.py             # 앱 진입점
│   ├── models.py           # DB 모델 정의 (SQLModel)
│   ├── database.py         # DB 연결 설정
│   └── ...
├── frontend/               # React 프론트엔드
│   ├── src/
│   │   ├── components/     # UI 컴포넌트
│   │   └── ...
│   ├── Dockerfile          # Frontend Docker 설정
│   └── ...
├── docker-compose.yml      # 전체 서비스 오케스트레이션 설정
└── ...
```

## ⚠️ 개발 참고사항

*   **데이터베이스**: 기본적으로 `backend/voyage.db` 파일에 SQLite 데이터가 저장됩니다.
*   **미디어 저장소**: 업로드된 파일은 MinIO 컨테이너에 저장되며 `minio_data` 볼륨으로 영구 보존됩니다.
*   **환경 변수**: `docker-compose.yml` 및 각 서비스의 `.env` 파일(필요 시)을 통해 환경 변수를 관리합니다.
