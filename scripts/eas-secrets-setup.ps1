# EAS production ortamina GOOGLE_MAPS_API_KEY ve (istege bagli) Firebase dosyalarini yukler.
# Onceden: npm i  ve  npx eas login
# Proje kokunde: npm run eas:secrets

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ""
Write-Host "=== EAS production secrets / env ===" -ForegroundColor Cyan
Write-Host "Proje: $Root"
Write-Host ""

$npx = "npx"
$eas = "eas-cli@latest"

& $npx $eas --version 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "eas-cli calistirilamadi. 'npm i' deneyin." -ForegroundColor Red
  exit 1
}

Write-Host "[1/4] Firebase dosyalari yerel dogrulama (varsa)..." -ForegroundColor Yellow
node "$Root\scripts\verify-firebase-config.js"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Yerel Firebase dosyalarinda uyumsuzluk var. Ctrl+C ile cikabilir veya Enter ile devam." -ForegroundColor Red
  Read-Host
}

Write-Host ""
Write-Host "[2/4] GOOGLE_MAPS_API_KEY (Android; zorunlu)" -ForegroundColor Yellow
Write-Host "Degeri yapistirin; atlamak icin bos Enter:"
$mapsKey = Read-Host

if ([string]::IsNullOrWhiteSpace($mapsKey)) {
  Write-Host "GOOGLE_MAPS_API_KEY atlandi. Sonradan: npx eas-cli env:create --environment production --name GOOGLE_MAPS_API_KEY --value YOUR_KEY --visibility secret" -ForegroundColor DarkYellow
} else {
  & $npx $eas env:create --environment production `
    --name GOOGLE_MAPS_API_KEY `
    --value $mapsKey `
    --visibility secret `
    --non-interactive
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Eklenemedi (zaten varsa: npx eas-cli env:update veya expo.dev'den silip tekrar deneyin)." -ForegroundColor Red
  } else {
    Write-Host "GOOGLE_MAPS_API_KEY production'a eklendi." -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "[3/4] Firebase — google-services.json (file env)" -ForegroundColor Yellow
$jsonPath = Join-Path $Root "google-services.json"
if (Test-Path $jsonPath) {
  & $npx $eas env:create --environment production `
    --name GOOGLE_SERVICES_JSON `
    --value $jsonPath `
    --type file `
    --visibility secret `
    --non-interactive
  if ($LASTEXITCODE -ne 0) {
    Write-Host "GOOGLE_SERVICES_JSON yuklenemedi (zaten tanimli olabilir)." -ForegroundColor DarkYellow
  } else {
    Write-Host "GOOGLE_SERVICES_JSON yuklendi." -ForegroundColor Green
  }
} else {
  Write-Host "google-services.json yok (atlandi). Dosyayi proje kokune koyup scripti tekrar calistirin veya expo.dev > Environment variables." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "[4/4] Firebase — GoogleService-Info.plist (file env)" -ForegroundColor Yellow
$plistPath = Join-Path $Root "GoogleService-Info.plist"
if (Test-Path $plistPath) {
  & $npx $eas env:create --environment production `
    --name GOOGLE_SERVICES_PLIST `
    --value $plistPath `
    --type file `
    --visibility secret `
    --non-interactive
  if ($LASTEXITCODE -ne 0) {
    Write-Host "GOOGLE_SERVICES_PLIST yuklenemedi (zaten tanimli olabilir)." -ForegroundColor DarkYellow
  } else {
    Write-Host "GOOGLE_SERVICES_PLIST yuklendi." -ForegroundColor Green
  }
} else {
  Write-Host "GoogleService-Info.plist yok (atlandi). Dosyayi proje kokune koyup scripti tekrar calistirin veya expo.dev." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "=== Manuel (web): Firebase + Apple Push ===" -ForegroundColor Cyan
Write-Host "1) Firebase Console: iOS app Bundle ID = com.hairdresser.app"
Write-Host "2) developer.apple.com > Keys: APNs .p8 olustur (bir kez indirilir)."
Write-Host "3) Firebase > Project settings > Cloud Messaging: APNs key + Key ID + Team ID"
Write-Host "4) App Store: Privacy + Review Notes (konum / arka plan gerekcesi)"
Write-Host ""
Write-Host "Sonraki adim: npx eas build --platform ios --profile production" -ForegroundColor Green
Write-Host ""
