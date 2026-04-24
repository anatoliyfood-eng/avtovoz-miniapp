$ErrorActionPreference = "Stop"

Write-Host "== Codex repo context =="

Write-Host "`nRepository:"
git remote -v

Write-Host "`nBranch:"
git branch --show-current

Write-Host "`nStatus:"
git status --short

Write-Host "`nImportant files:"
$Files = @(
    "AGENTS.md",
    "README.md",
    "index.html",
    "css/style.css",
    "js/app.js"
)

foreach ($File in $Files) {
    if (Test-Path $File) {
        Write-Host "OK  $File"
    }
}

Write-Host "`nSuggested next steps:"
Write-Host "1. Read AGENTS.md"
Write-Host "2. Read README.md"
Write-Host "3. Inspect only files related to the task"
Write-Host "4. Run scripts/check.ps1 after changes"
