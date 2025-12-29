# Check if Ollama is installed
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Ollama is not installed or not in your PATH." -ForegroundColor Red
    Write-Host "Please install Ollama from https://ollama.com/"
    exit 1
}

Write-Host "Checking local Ollama service status..." -ForegroundColor Cyan
try {
    $status = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -ErrorAction Stop
    Write-Host "Ollama service is running!" -ForegroundColor Green
} catch {
    Write-Host "Error: Could not connect to Ollama at http://localhost:11434" -ForegroundColor Red
    Write-Host "Please ensure 'ollama serve' is running in another terminal."
    exit 1
}

# Define recommended models
$models = @(
    @{ Name = "moondream"; Desc = "Tiny, fast vision model (1.7GB). Best for low-end hardware." },
    @{ Name = "llava-phi3"; Desc = "High-performance small vision model (2.3GB). Good balance." },
    @{ Name = "llama3"; Desc = "Fast standard LLM for text logic (4.7GB)." }
)

Write-Host "`nReady to pull recommended models:" -ForegroundColor Yellow
foreach ($m in $models) {
    Write-Host "  - $($m.Name): $($m.Desc)"
}

$confirm = Read-Host "`nDo you want to pull these models now? (Y/n)"
if ($confirm -eq 'n') { exit }

foreach ($m in $models) {
    Write-Host "`nPulling $($m.Name)..." -ForegroundColor Cyan
    ollama pull $m.Name
}

Write-Host "`nAll models ready! You can now select them in the KV-Graph settings." -ForegroundColor Green
