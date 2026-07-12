param(
  [string]$Source = "K:\Dropbox\Pictures\2026\Oxbowpalooza 2026",
  [int]$QuietSeconds = 45,
  [int]$StableChecks = 3,
  [int]$StableDelaySeconds = 5
)

$ErrorActionPreference = "Stop"

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$publishScript = Join-Path $PSScriptRoot "publish-gallery.ps1"
$supportedExtensions = @(".jpg", ".jpeg", ".png", ".webp", ".gif")
$lastChange = Get-Date
$pending = $true
$isPublishing = $false

function Get-GallerySignature {
  $files = Get-ChildItem -LiteralPath $sourcePath -File |
    Where-Object { $supportedExtensions -contains $_.Extension.ToLowerInvariant() } |
    Sort-Object FullName |
    ForEach-Object { "$($_.FullName)|$($_.Length)|$($_.LastWriteTimeUtc.Ticks)" }

  return $files -join "`n"
}

function Wait-ForStableFolder {
  $stableCount = 0
  $previous = Get-GallerySignature

  while ($stableCount -lt $StableChecks) {
    Start-Sleep -Seconds $StableDelaySeconds
    $current = Get-GallerySignature

    if ($current -eq $previous) {
      $stableCount += 1
    } else {
      $stableCount = 0
      $previous = $current
    }
  }
}

function Publish-Gallery {
  if ($script:isPublishing) {
    return
  }

  $script:isPublishing = $true

  try {
    Write-Output "Dropbox gallery changed. Waiting for uploads to finish..."
    Wait-ForStableFolder
    & powershell.exe -ExecutionPolicy Bypass -File $publishScript -CommitMessage "Auto refresh photo gallery"
    Write-Output "Watching for more Oxbowpalooza uploads."
  } catch {
    Write-Warning "Gallery publish failed: $($_.Exception.Message)"
  } finally {
    $script:isPublishing = $false
  }
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $sourcePath
$watcher.IncludeSubdirectories = $false
$watcher.Filter = "*.*"
$watcher.NotifyFilter = [System.IO.NotifyFilters]"FileName, LastWrite, Size"
$watcher.EnableRaisingEvents = $true

$action = {
  $extension = [System.IO.Path]::GetExtension($Event.SourceEventArgs.FullPath).ToLowerInvariant()

  if ($event.MessageData.Extensions -contains $extension) {
    $event.MessageData.State.LastChange = Get-Date
    $event.MessageData.State.Pending = $true
  }
}

$state = [pscustomobject]@{
  LastChange = $lastChange
  Pending = $pending
}

$messageData = [pscustomobject]@{
  Extensions = $supportedExtensions
  State = $state
}

$subscriptions = @(
  Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action -MessageData $messageData
  Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action -MessageData $messageData
  Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $action -MessageData $messageData
  Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $action -MessageData $messageData
)

Write-Output "Watching $sourcePath for gallery uploads. Leave this window open."

try {
  while ($true) {
    Start-Sleep -Seconds 5

    if ($state.Pending -and -not $isPublishing) {
      $quietFor = (New-TimeSpan -Start $state.LastChange -End (Get-Date)).TotalSeconds

      if ($quietFor -ge $QuietSeconds) {
        $state.Pending = $false
        Publish-Gallery
      }
    }
  }
} finally {
  $watcher.EnableRaisingEvents = $false
  $watcher.Dispose()
  $subscriptions | ForEach-Object { Unregister-Event -SubscriptionId $_.Id }
}
