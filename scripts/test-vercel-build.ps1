# ============================================================
# test-vercel-build.ps1
# Simulates a clean Vercel build locally.
# Run from the project root: .\scripts\test-vercel-build.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Vercel Build Simulator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectRoot

# Step 1: Wipe generated artifacts (simulate fresh Vercel environment)
Write-Host "[1/5] Cleaning generated files..." -ForegroundColor Yellow
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next"; Write-Host "  Removed .next" }
if (Test-Path "node_modules\.prisma") { Remove-Item -Recurse -Force "node_modules\.prisma"; Write-Host "  Removed node_modules\.prisma" }
if (Test-Path "node_modules\@prisma\client") { Remove-Item -Recurse -Force "node_modules\@prisma\client"; Write-Host "  Removed node_modules\@prisma\client" }

# Step 2: Reinstall deps (simulate fresh npm install)
Write-Host ""
Write-Host "[2/5] Installing dependencies (clean)..." -ForegroundColor Yellow
npm ci --prefer-offline 2>&1 | Tail-Object -Last 5
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: npm ci failed" -ForegroundColor Red; exit 1 }

# Step 3: Run prisma generate WITHOUT DATABASE_URL (exactly like Vercel)
Write-Host ""
Write-Host "[3/5] Running prisma generate (no DATABASE_URL)..." -ForegroundColor Yellow
$env:DATABASE_URL = $null
npx prisma generate
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: prisma generate failed" -ForegroundColor Red; exit 1 }
Write-Host "  prisma generate: OK" -ForegroundColor Green

# Step 4: Run TypeScript check (no DATABASE_URL)
Write-Host ""
Write-Host "[4/5] Running TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit --skipLibCheck
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: TypeScript check failed" -ForegroundColor Red; exit 1 }
Write-Host "  TypeScript: OK" -ForegroundColor Green

# Step 5: Run next build (no DATABASE_URL - same as Vercel)
Write-Host ""
Write-Host "[5/5] Running next build (no DATABASE_URL)..." -ForegroundColor Yellow
# We skip prisma generate here since we already ran it above
$env:SKIP_PRISMA_GENERATE = "1"
npx next build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: next build failed" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL - Safe to deploy!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
