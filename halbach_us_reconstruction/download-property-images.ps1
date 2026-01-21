# Download missing property images from halbach.us
$baseUrl = 'https://www.halbach.us/uploads/2/'
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetDir = Join-Path $scriptPath 'uploads\2'

$images = @(
    'DSC00437_web.jpg',
    'DSC00449_web.jpg',
    'DSC00431_web.jpg',
    'DSC00438_web.jpg',
    'DSC00502_web.jpg',
    'DSC00505_web.jpg',
    'DSC00460_web.jpg',
    'DSC00466_web.jpg',
    'DSC00457_web.jpg',
    '9.jpg',
    'DSC00469_web.jpg',
    'DSC00475_web.jpg',
    'DSC00454_web.jpg',
    'DSC00491_web.jpg',
    'DSC00508_web.jpg',
    'DSC00444_web.jpg',
    'DSC00541_web.jpg',
    'DSC00514-Edit_web.jpg',
    'DSC00530-Edit_web.jpg'
)

Write-Host "Downloading missing property images..." -ForegroundColor Green
Write-Host ""

foreach ($img in $images) {
    $url = $baseUrl + $img
    $target = Join-Path $targetDir $img
    
    if (Test-Path $target) {
        Write-Host "  Skipping $img (already exists)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "  Downloading $img..." -NoNewline
    try {
        Invoke-WebRequest -Uri $url -OutFile $target -UseBasicParsing -ErrorAction Stop
        Write-Host " OK" -ForegroundColor Green
    } catch {
        Write-Host " Failed" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
