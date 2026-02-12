
# 1. Kill process on port 8000
$port = 8000
$tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($tcp) {
    Write-Host "Port $port is in use. Killing process..." -ForegroundColor Yellow
    $processId = $tcp.OwningProcess
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Write-Host "Process $processId killed." -ForegroundColor Green
} else {
    Write-Host "Port $port is free." -ForegroundColor Green
}

# 2. Activate Virtual Environment
$venvPath = ".\.venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    . $venvPath
} else {
    Write-Host "Virtual environment not found at $venvPath, skipping activation." -ForegroundColor Red
}

# 3. Start Server
# Using python -m app.main to leverage the dynamic port logic in main.py
Write-Host "Starting Server..." -ForegroundColor Cyan
python -m app.main
