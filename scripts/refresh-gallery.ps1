param(
  [string]$Source = "K:\Dropbox\Pictures\2026\Oxbowpalooza 2026",
  [string]$GalleryDir = "assets\gallery",
  [string]$Manifest = "photo-gallery.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$galleryPath = Join-Path $projectRoot $GalleryDir
$manifestPath = Join-Path $projectRoot $Manifest
$imageExtensions = @(".jpg", ".jpeg", ".png", ".webp", ".gif")
$videoExtensions = @(".mp4", ".mov", ".m4v", ".webm")
$supportedExtensions = $imageExtensions + $videoExtensions

New-Item -ItemType Directory -Force -Path $galleryPath | Out-Null

function Convert-ToSlug {
  param([string]$Value)

  $slug = $Value.ToLowerInvariant() -replace "[^a-z0-9]+", "-"
  $slug = $slug.Trim("-")

  if ([string]::IsNullOrWhiteSpace($slug)) {
    return "photo"
  }

  return $slug
}

function Convert-ToCaption {
  param([string]$Value)

  $submitter = ($Value -split "[-_ ]+")[0]
  return $submitter.Trim()
}

$photos = Get-ChildItem -LiteralPath $sourcePath -File |
  Where-Object { $supportedExtensions -contains $_.Extension.ToLowerInvariant() } |
  Sort-Object LastWriteTime, Name

$manifestItems = @()
$usedNames = @{}

foreach ($photo in $photos) {
  $baseName = Convert-ToSlug -Value $photo.BaseName
  $extension = $photo.Extension.ToLowerInvariant()
  $fileName = "$baseName$extension"

  if ($usedNames.ContainsKey($fileName)) {
    $usedNames[$fileName] += 1
    $fileName = "$baseName-$($usedNames[$fileName])$extension"
  } else {
    $usedNames[$fileName] = 1
  }

  $destinationPath = Join-Path $galleryPath $fileName
  Copy-Item -LiteralPath $photo.FullName -Destination $destinationPath -Force

  $manifestItems += [ordered]@{
    src = "./$($GalleryDir -replace "\\", "/")/$fileName"
    type = $(if ($videoExtensions -contains $extension) { "video" } else { "image" })
    alt = "Oxbowpalooza photo: $(Convert-ToCaption -Value $photo.BaseName)"
    caption = Convert-ToCaption -Value $photo.BaseName
  }
}

ConvertTo-Json -InputObject @($manifestItems) -Depth 4 |
  Set-Content -LiteralPath $manifestPath -Encoding utf8

Write-Output "Gallery refreshed with $($manifestItems.Count) photo(s)."
