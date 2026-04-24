$ErrorActionPreference = "Stop"

Write-Host "== Mini App check =="

$Required = @(
    "index.html",
    "css/style.css",
    "js/app.js",
    "AGENTS.md",
    "README.md"
)

foreach ($Path in $Required) {
    if (!(Test-Path $Path)) {
        throw "Missing required file: $Path"
    }
}

Write-Host "Mini App structure looks OK."
