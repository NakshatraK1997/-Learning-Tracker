
$port = 8000

# 1. Find and Kill Process on Port 8000
Write-Host "Checking for process on port $port..." -ForegroundColor Cyan
$tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($tcp) {
    $processId = $tcp.OwningProcess
    Write-Host "Found process $processId on port $port. Terminating..." -ForegroundColor Yellow
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    
    # Double check if killed
    Start-Sleep -Seconds 1
    if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
         Write-Host "Failed to kill process $processId. Please kill it manually." -ForegroundColor Red
         exit 1
    } else {
         Write-Host "Process $processId terminated successfully." -ForegroundColor Green
    }
} else {
    Write-Host "Port $port is free." -ForegroundColor Green
}

# 2. Start Uvicorn on Port 8000
Write-Host "Starting Uvicorn on port $port..." -ForegroundColor Cyan
# Using uvicorn command directly as requested, but python -m is safer for path issues. 
# User asked for: "runs uvicorn app.main:app --reload --port 8000"
# We will use 'python -m uvicorn' to be robust against PATH issues unless strictly forbidden.
# The user request said "runs uvicorn app.main:app..." - this is usually the command string.
# 'python -m uvicorn' is functionally equivalent but safer. I will use it.
python -m uvicorn app.main:app --reload --port 8000
