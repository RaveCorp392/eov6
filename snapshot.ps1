param(
  [string]$SourcePath = ".",
  [string]$OutDir = ".\_snapshots",
  [string[]]$Include = @("app\api\webhooks\route.ts","lib\firebaseAdmin.ts","lib\stripe.ts","lib\entitlements.ts",".env.local")
)
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipName = "eov6-baseline-$timestamp.zip"
$zipPath = Join-Path $OutDir $zipName
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# Collect files that exist
$files = @()
foreach ($rel in $Include) {
  $p = Join-Path $SourcePath $rel
  if (Test-Path $p) { $files += $p }
}
if ($files.Count -eq 0) {
  Write-Host "No files found to snapshot." -ForegroundColor Yellow
  exit 0
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath,[System.IO.Compression.ZipArchiveMode]::Create)
foreach ($file in $files) {
  $rel = Resolve-Path $file | ForEach-Object { $_.Path.Replace((Resolve-Path $SourcePath).Path + "\","") }
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file,$rel,[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}
$zip.Dispose()
Write-Host "Snapshot written:" $zipPath -ForegroundColor Green
