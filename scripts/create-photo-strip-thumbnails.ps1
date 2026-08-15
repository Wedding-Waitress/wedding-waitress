param(
  [Parameter(Mandatory = $true)][string]$JobsFile,
  [Parameter(Mandatory = $true)][string]$ResultsFile
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$jobs = Get-Content -Raw -LiteralPath $JobsFile | ConvertFrom-Json
$results = @()

foreach ($job in $jobs) {
  $sourceImage = $null
  $thumbnail = $null
  $graphics = $null
  try {
    $sourceImage = [System.Drawing.Image]::FromFile([string]$job.source)
    if ($sourceImage.Width -ne 1200 -or $sourceImage.Height -ne 1800) {
      throw "Decoded dimensions were $($sourceImage.Width) x $($sourceImage.Height), expected 1200 x 1800."
    }

    $thumbnail = New-Object System.Drawing.Bitmap 288, 432, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($thumbnail)
    $graphics.Clear([System.Drawing.Color]::FromArgb(24, 11, 7))
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($sourceImage, 0, 0, 288, 432)

    $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
      Where-Object { $_.MimeType -eq 'image/jpeg' } |
      Select-Object -First 1
    $qualityEncoder = [System.Drawing.Imaging.Encoder]::Quality
    $encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters 1
    $encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter $qualityEncoder, ([long]78)
    $thumbnail.Save([string]$job.destination, $jpegCodec, $encoderParameters)
    $encoderParameters.Dispose()

    $results += [pscustomobject]@{ id = [string]$job.id; ok = $true; error = $null }
  }
  catch {
    $results += [pscustomobject]@{ id = [string]$job.id; ok = $false; error = $_.Exception.Message }
  }
  finally {
    if ($graphics) { $graphics.Dispose() }
    if ($thumbnail) { $thumbnail.Dispose() }
    if ($sourceImage) { $sourceImage.Dispose() }
  }
}

$results | ConvertTo-Json -Depth 4 -Compress | Set-Content -LiteralPath $ResultsFile -Encoding UTF8
