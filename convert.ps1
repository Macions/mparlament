# convert.ps1 – konwersja CSS na moduł CSS z camelCase

$dir = "A:\mparl backend\mparlament-frontend\src\features\dashboard\pages"
$jsxFile = Join-Path $dir "Dashboard.jsx"
$cssFile = Join-Path $dir "Dashboard.module.css"

# ─── KROK 1: Zmień className="..." na className={styles....} ───
Write-Host "Krok 1: Konwersja className w JSX..." -ForegroundColor Cyan

$content = Get-Content $jsxFile -Raw

# Wzorzec: className="klasa" → className={styles.klasa}
$content = $content -replace 'className="([^"]+)"', {
    $classes = $matches[1] -split '\s+'
    $converted = $classes | ForEach-Object {
        # BEM: dashboard__user → dashboardUser
        # BEM: dashboard__card--session → dashboardCardSession
        $camel = $_ -replace '__', ' ' -replace '--', ' ' -replace '-', ' '
        $parts = $camel -split '\s+'
        $result = $parts[0]
        for ($i = 1; $i -lt $parts.Count; $i++) {
            if ($parts[$i].Length -gt 0) {
                $result += $parts[$i].Substring(0, 1).ToUpper() + $parts[$i].Substring(1)
            }
        }
        "styles.$result"
    }
    "className={`$($converted -join '} ${')}" -replace '\$\{', '{' -replace '\}', '}'
}

Set-Content $jsxFile $content -NoNewline
Write-Host "  ✔ JSX zaktualizowany" -ForegroundColor Green

# ─── KROK 2: Zmień nazwy klas w CSS na camelCase ───
Write-Host "Krok 2: Konwersja nazw klas w CSS..." -ForegroundColor Cyan

$cssContent = Get-Content $cssFile -Raw

# Znajdź wszystkie selektory .klasa
$cssContent = [regex]::Replace($cssContent, '\.([a-zA-Z][a-zA-Z0-9_-]*)', {
        $className = $matches[1]
        # BEM: dashboard__user → dashboardUser
        $camel = $className -replace '__', ' ' -replace '--', ' ' -replace '-', ' '
        $parts = $camel -split '\s+'
        $result = $parts[0]
        for ($i = 1; $i -lt $parts.Count; $i++) {
            if ($parts[$i].Length -gt 0) {
                $result += $parts[$i].Substring(0, 1).ToUpper() + $parts[$i].Substring(1)
            }
        }
        ".$result"
    })

Set-Content $cssFile $cssContent -NoNewline
Write-Host "  ✔ CSS zaktualizowany" -ForegroundColor Green

# ─── KROK 3: Zmień import w JSX ───
Write-Host "Krok 3: Zmiana importu w JSX..." -ForegroundColor Cyan

$content = Get-Content $jsxFile -Raw
$content = $content -replace 'import "\./Dashboard\.css";', 'import styles from "./Dashboard.module.css";'
Set-Content $jsxFile $content -NoNewline
Write-Host "  ✔ Import zaktualizowany" -ForegroundColor Green

Write-Host "`n✅ Gotowe!" -ForegroundColor Green
Write-Host "Sprawdź pliki:" -ForegroundColor Yellow
Write-Host "  $jsxFile"
Write-Host "  $cssFile"