$ErrorActionPreference = "Stop"

$Port = 8080

if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Serving on http://127.0.0.1:$Port"
    python -m http.server $Port
} else {
    throw "Python is required to serve this folder locally."
}
