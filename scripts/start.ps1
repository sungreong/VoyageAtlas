param(
  [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "VoyageAtlas startup" -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is not installed or not available in PATH."
}

$composeArgs = @("compose", "up", "-d")
if (-not $NoBuild) {
  $composeArgs += "--build"
}

Write-Host "Starting Docker services..." -ForegroundColor Cyan
docker @composeArgs

Write-Host ""
Write-Host "VoyageAtlas is starting." -ForegroundColor Green
Write-Host "Frontend:        http://localhost:3333"
Write-Host "Backend API:     http://localhost:8888/docs"
Write-Host "MinIO Console:   http://localhost:9991"
Write-Host "MinIO login:     minioadmin / minioadmin"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  docker compose logs -f"
Write-Host "  docker compose down"
