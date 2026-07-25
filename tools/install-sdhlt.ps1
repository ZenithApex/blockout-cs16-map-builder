[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$toolsDirectory = $PSScriptRoot
$releaseUrl = "https://github.com/seedee/SDHLT/releases/download/v1.2.0/sdhlt_v120.zip"
$archiveHash = "F271D24C00BBD59F1E388FE71847CC078A12DAC56F8BD773BB48797B5F044D7A"
$required = [ordered]@{
    "sdHLCSG_x64.exe" = "8AFB5D2CF16CC1B248EC46D0ED566A27123A1710630D1CA764B85A15232F3537"
    "sdHLBSP_x64.exe" = "3FB9B5FF493552F978E58784E660987EC1058CCB2464CE40CB8B9C5E9DFC2BAA"
    "sdHLVIS_x64.exe" = "CB94BD9CC5F8EEAE6368B2B72A6723F182F87F5ECBCDF80B6F330E483F5B9477"
    "sdHLRAD_x64.exe" = "769EA697B3E6C4003D4A50BE980EFA7716C7A7CC1B55E71FEE656AB349FFAFDB"
}

$alreadyInstalled = -not $Force
foreach ($name in $required.Keys) {
    $target = Join-Path $toolsDirectory $name
    if (-not (Test-Path -LiteralPath $target) -or (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $required[$name]) {
        $alreadyInstalled = $false
        break
    }
}
if ($alreadyInstalled -and (Test-Path -LiteralPath (Join-Path $toolsDirectory "sdhlt.wad"))) {
    Write-Host "Verified SDHLT v1.2.0 is already installed."
    exit 0
}

$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ("blockout-sdhlt-" + [Guid]::NewGuid().ToString("N"))
$archive = Join-Path $temporaryRoot "sdhlt_v120.zip"
$expanded = Join-Path $temporaryRoot "expanded"
try {
    New-Item -ItemType Directory -Path $expanded -Force | Out-Null
    Write-Host "Downloading SDHLT v1.2.0 from the official GitHub release..."
    Invoke-WebRequest -Uri $releaseUrl -OutFile $archive -UseBasicParsing
    $actualArchiveHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
    if ($actualArchiveHash -ne $archiveHash) {
        throw "SDHLT archive verification failed. Expected $archiveHash but received $actualArchiveHash."
    }
    Expand-Archive -LiteralPath $archive -DestinationPath $expanded -Force

    foreach ($name in $required.Keys) {
        $source = Get-ChildItem -LiteralPath $expanded -Recurse -File -Filter $name | Select-Object -First 1
        if (-not $source) { throw "The verified archive does not contain $name." }
        if ((Get-FileHash -LiteralPath $source.FullName -Algorithm SHA256).Hash -ne $required[$name]) {
            throw "$name failed executable verification."
        }
        Copy-Item -LiteralPath $source.FullName -Destination (Join-Path $toolsDirectory $name) -Force
    }

    $wad = Get-ChildItem -LiteralPath $expanded -Recurse -File -Filter "sdhlt.wad" | Select-Object -First 1
    if (-not $wad) { throw "The verified archive does not contain sdhlt.wad." }
    Copy-Item -LiteralPath $wad.FullName -Destination (Join-Path $toolsDirectory "sdhlt.wad") -Force
    Write-Host "Installed and verified SDHLT v1.2.0 x64."
}
finally {
    $fullTemporaryRoot = [IO.Path]::GetFullPath($temporaryRoot)
    $systemTemporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if ($fullTemporaryRoot.StartsWith($systemTemporaryRoot, [StringComparison]::OrdinalIgnoreCase) -and
        (Test-Path -LiteralPath $temporaryRoot)) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
    }
}
