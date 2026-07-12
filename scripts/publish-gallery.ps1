param(
  [string]$CommitMessage = "Refresh photo gallery"
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$refreshScript = Join-Path $PSScriptRoot "refresh-gallery.ps1"

Set-Location -LiteralPath $projectRoot

& powershell.exe -ExecutionPolicy Bypass -File $refreshScript

$changes = git status --short -- photo-gallery.json assets/gallery

if ([string]::IsNullOrWhiteSpace($changes)) {
  Write-Output "Gallery is already up to date."
  exit 0
}

git add photo-gallery.json assets/gallery
git commit -m $CommitMessage
git push origin main

Write-Output "Gallery changes pushed live."
