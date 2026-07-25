[CmdletBinding()]
param(
    [string]$Python = "python"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist-app"
$work = Join-Path $root ".pyinstaller-work"
$spec = Join-Path $root ".pyinstaller-spec"

& $Python -m PyInstaller `
    --clean `
    --noconfirm `
    --onefile `
    --console `
    --name Blockout `
    --distpath $dist `
    --workpath $work `
    --specpath $spec `
    (Join-Path $root "blockout_companion.py")

if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath (Join-Path $dist "Blockout.exe"))) {
    throw "Blockout.exe was not produced."
}
Write-Host "Created $dist\Blockout.exe"
