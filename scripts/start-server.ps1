# Simple Local HTTP Server for Testing Halbach.us Website
# Run this script from the halbach_us_reconstruction root directory

Write-Host "Starting local web server for Halbach.us website..." -ForegroundColor Green
Write-Host ""

$websitePath = Get-Location

Write-Host "Website path: $websitePath" -ForegroundColor Cyan
Write-Host ""

# Check for Python
$python3 = Get-Command python -ErrorAction SilentlyContinue
if ($python3) {
    Write-Host "Starting Python HTTP server on http://127.0.0.1:8000" -ForegroundColor Green
    Write-Host "Open your browser and go to: http://127.0.0.1:8000 or http://localhost:8000" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    python -m http.server 8000 --bind 127.0.0.1
    exit 0
}

# Check for Python 3 specifically
$python3exe = Get-Command python3 -ErrorAction SilentlyContinue
if ($python3exe) {
    Write-Host "Starting Python 3 HTTP server on http://127.0.0.1:8000" -ForegroundColor Green
    Write-Host "Open your browser and go to: http://127.0.0.1:8000 or http://localhost:8000" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    python3 -m http.server 8000 --bind 127.0.0.1
    exit 0
}

# Check for Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    Write-Host "Starting Node.js http-server on http://localhost:8000" -ForegroundColor Green
    Write-Host "Open your browser and go to: http://localhost:8000" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    
    # Try to use http-server if available, otherwise install it
    $httpServer = Get-Command http-server -ErrorAction SilentlyContinue
    if (-not $httpServer) {
        Write-Host "http-server not found. Installing globally..." -ForegroundColor Yellow
        npm install -g http-server
    }
    npx http-server -p 8000
    exit 0
}

# Check for PHP
$php = Get-Command php -ErrorAction SilentlyContinue
if ($php) {
    Write-Host "Starting PHP built-in server on http://localhost:8000" -ForegroundColor Green
    Write-Host "Open your browser and go to: http://localhost:8000" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    php -S localhost:8000
    exit 0
}

# If nothing found, provide instructions
Write-Host ""
Write-Host "No suitable server found. Please install one of the following:" -ForegroundColor Red
Write-Host ""
Write-Host "Option 1 - Python (Recommended):" -ForegroundColor Yellow
Write-Host "  Download from: https://www.python.org/downloads/" -ForegroundColor White
Write-Host "  Then run: python -m http.server 8000" -ForegroundColor White
Write-Host ""
Write-Host "Option 2 - Node.js:" -ForegroundColor Yellow
Write-Host "  Download from: https://nodejs.org/" -ForegroundColor White
Write-Host "  Then run: npx http-server -p 8000" -ForegroundColor White
Write-Host ""
Write-Host "Option 3 - PHP:" -ForegroundColor Yellow
Write-Host "  Download from: https://www.php.net/downloads.php" -ForegroundColor White
Write-Host "  Then run: php -S localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "Option 4 - VS Code:" -ForegroundColor Yellow
Write-Host "  Install 'Live Server' extension" -ForegroundColor White
Write-Host "  Right-click index.html and select 'Open with Live Server'" -ForegroundColor White
Write-Host ""
Write-Host "Option 5 - Simple PowerShell Server (if you have .NET):" -ForegroundColor Yellow
Write-Host "  You can also just open index.html directly in your browser" -ForegroundColor White
Write-Host "  But some features (YouTube video) may not work correctly" -ForegroundColor White
