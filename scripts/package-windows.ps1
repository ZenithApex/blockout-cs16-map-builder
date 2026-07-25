[CmdletBinding()]
param(
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $root "release"
$folderName = "Blockout-CS16-Map-Builder-v$Version"
$stage = Join-Path $releaseRoot $folderName
$archive = Join-Path $releaseRoot "$folderName.zip"

if (-not ([IO.Path]::GetFullPath($stage)).StartsWith([IO.Path]::GetFullPath($releaseRoot), [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to package outside the release directory."
}

if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

$files = @(
    "index.html", "app.js", "styles.css",
    "blockout_companion.py", "Start Blockout.cmd", "Setup Blockout.cmd",
    "README.md", "TESTING.md", "LICENSE", "THIRD_PARTY_NOTICES.md"
)
foreach ($relative in $files) {
    Copy-Item -LiteralPath (Join-Path $root $relative) -Destination (Join-Path $stage $relative)
}

New-Item -ItemType Directory -Path (Join-Path $stage "textures\previews") -Force | Out-Null
Get-ChildItem -LiteralPath (Join-Path $root "textures\previews") -File |
    Where-Object { $_.Name -notlike "USR_*" -and $_.Extension -in @(".png", ".svg") } |
    Copy-Item -Destination (Join-Path $stage "textures\previews")
Copy-Item -LiteralPath (Join-Path $root "textures\asset-manifest.base.json") -Destination (Join-Path $stage "textures\asset-manifest.base.json")

New-Item -ItemType Directory -Path (Join-Path $stage "assets") -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $root "assets\sunburst-base.wad") -Destination (Join-Path $stage "assets\sunburst-base.wad")

New-Item -ItemType Directory -Path (Join-Path $stage "tools") -Force | Out-Null
$toolFiles = @(
    "PUT_COMPILERS_HERE.txt", "SDHLT_LICENSE.md", "SDHLT_README.md", "SDHLT_SOURCE.txt",
    "build_sunburst_wad.js", "install-sdhlt.ps1", "package.json"
)
foreach ($relative in $toolFiles) {
    $source = Join-Path $root "tools\$relative"
    if (Test-Path -LiteralPath $source) {
        Copy-Item -LiteralPath $source -Destination (Join-Path $stage "tools\$relative")
    }
}

Compress-Archive -LiteralPath $stage -DestinationPath $archive -CompressionLevel Optimal
$hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
Write-Host "Created $archive"
Write-Host "SHA-256 $hash"
