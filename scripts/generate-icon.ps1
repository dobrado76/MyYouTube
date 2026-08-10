# Generate a transparent MyYouTube app icon (PNG), then rebuild .ico via make-icon.mjs
Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

$size = 1024
$bmp = New-Object Drawing.Bitmap $size, $size
$bmp.SetResolution(96, 96)
$g = [Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.Clear([Drawing.Color]::Transparent)

# Inset keeps silhouette crisp when Windows downscales
$pad = 72
$box = $size - (2 * $pad)
$radius = 240
$path = New-RoundedRectPath $pad $pad $box $box $radius

# Brand accent #c1121f — flat fill (no black plate, no gloss)
$fill = New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(255, 0xC1, 0x12, 0x1F))
$g.FillPath($fill, $path)

# Slightly darker edge ring for definition on light taskbars
$edge = New-Object Drawing.Pen ([Drawing.Color]::FromArgb(40, 0, 0, 0), 10)
$g.DrawPath($edge, $path)

# Play triangle, optically shifted right; rounded feel via thick stroke fill
$cx = [float]($size / 2 + 36)
$cy = [float]($size / 2)
$triH = 360.0
$triW = [float]($triH * 0.88)
$p1 = New-Object Drawing.PointF ($cx - $triW * 0.42), ($cy - $triH / 2)
$p2 = New-Object Drawing.PointF ($cx - $triW * 0.42), ($cy + $triH / 2)
$p3 = New-Object Drawing.PointF ($cx + $triW * 0.58), $cy
$tri = New-Object Drawing.Drawing2D.GraphicsPath
$tri.AddPolygon(@($p1, $p2, $p3))

$white = New-Object Drawing.SolidBrush ([Drawing.Color]::White)
$g.FillPath($white, $tri)

$root = Split-Path -Parent $PSScriptRoot
if (-not $root) { $root = 'f:\Sites\MyYoutube' }
# When run as scripts\generate-icon.ps1, parent of scripts is repo root
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$outPng = Join-Path $root 'resources\icon-source.png'
$bmp.Save($outPng, [Drawing.Imaging.ImageFormat]::Png)

$g.Dispose(); $bmp.Dispose(); $fill.Dispose(); $edge.Dispose(); $white.Dispose()
$path.Dispose(); $tri.Dispose()

Write-Host "Wrote $outPng"
Set-Location $root
node (Join-Path $root 'scripts\make-icon.mjs')
