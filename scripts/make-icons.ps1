Add-Type -AssemblyName System.Drawing

function New-Icon([string]$path, [int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(15, 23, 42))
  $accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(56, 189, 248))
  $g.FillRectangle($accent, [int]($size * 0.18), [int]($size * 0.72), [int]($size * 0.64), [int]($size * 0.08))
  $font = New-Object System.Drawing.Font "Segoe UI", ([int]($size * 0.28)), ([System.Drawing.FontStyle]::Bold)
  $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(226, 232, 240))
  $g.DrawString("M", $font, $textBrush, [int]($size * 0.28), [int]($size * 0.22))
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

New-Icon "public\icons\icon-192.png" 192
New-Icon "public\icons\icon-512.png" 512
Write-Host "icons ok"
