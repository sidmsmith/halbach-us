# Simple Local HTTP Server for Testing Halbach.us Website
# PowerShell script to start a local web server

Write-Host "Starting local web server for Halbach.us website..." -ForegroundColor Green
Write-Host ""

# Get the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$websitePath = Join-Path $scriptPath "halbach_us_reconstruction"

# Check if directory exists
if (-not (Test-Path $websitePath)) {
    Write-Host "Error: Website directory not found at: $websitePath" -ForegroundColor Red
    Write-Host "Please make sure you're running this from the halbach_us_reconstruction folder." -ForegroundColor Yellow
    exit 1
}

Write-Host "Website path: $websitePath" -ForegroundColor Cyan
Write-Host ""

# Try different methods to start a server
Write-Host "Attempting to start server using Python..." -ForegroundColor Yellow

# Check for Python
$python3 = Get-Command python -ErrorAction SilentlyContinue
if ($python3) {
    Set-Location $websitePath
    Write-Host "Starting Python HTTP server on http://localhost:8000" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    python -m http.server 8000
    exit 0
}

Write-Host "Python not found. Checking for Node.js..." -ForegroundColor Yellow

# Check for Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    # Check for http-server
    $httpServer = Get-Command http-server -ErrorAction SilentlyContinue
    if (-not $httpServer) {
        Write-Host "Installing http-server..." -ForegroundColor Yellow
        npm install -g http-server
    }
    Set-Location $websitePath
    Write-Host "Starting http-server on http://localhost:8000" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    http-server -p 8000
    exit 0
}

Write-Host "Node.js not found. Checking for PHP..." -ForegroundColor Yellow

# Check for PHP
$php = Get-Command php -ErrorAction SilentlyContinue
if ($php) {
    Set-Location $websitePath
    Write-Host "Starting PHP built-in server on http://localhost:8000" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    php -S localhost:8000
    exit 0
}

# If nothing found, provide instructions
Write-Host ""
Write-Host "No suitable server found. Please install one of the following:" -ForegroundColor Red
Write-Host "  1. Python 3: https://www.python.org/downloads/" -ForegroundColor Yellow
Write-Host "  2. Node.js: https://nodejs.org/" -ForegroundColor Yellow
Write-Host "  3. PHP: https://www.php.net/downloads.php" -ForegroundColor Yellow
Write-Host ""
Write-Host "Or use VS Code with the 'Live Server' extension." -ForegroundColor Cyan
Write-Host ""
Write-Host "Alternatively, you can open index.html directly in your browser," -ForegroundColor Yellow
Write-Host "but some features (like YouTube video) may not work correctly." -ForegroundColor Yellow
