$ErrorActionPreference = 'Stop'
$projectDir = $PSScriptRoot
$nodeBinary = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (-not (Test-Path -LiteralPath $nodeBinary)) {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCommand) { $nodeBinary = $nodeCommand.Source } else {
    Start-Process -FilePath (Join-Path $projectDir 'dist\index.html')
    Write-Host 'Opened offline version. No installation required.'
    exit 0
  }
}
$port = 4173
try {
  $health = Invoke-WebRequest -Uri "http://127.0.0.1:$port/__health" -UseBasicParsing -TimeoutSec 2
  if ($health.Content -eq 'time-poverty-demo-v7') { Start-Process "http://127.0.0.1:$port"; exit 0 }
} catch {}
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,0)
try { $listener.Start(); $port = $listener.LocalEndpoint.Port } finally { $listener.Stop() }
$url = "http://127.0.0.1:$port"
# Prefer the same origin across launches so the browser keeps the same save.
try {
  $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,4173)
  $probe.Start(); $port=4173; $url="http://127.0.0.1:$port"
} catch {} finally { if($probe){$probe.Stop()} }
Write-Host 'A LITTLE TIME FOR YOURSELF - local demo'
Write-Host 'Keep this window open while playing. Close it to stop the server.'
Write-Host "Opening $url"
& $nodeBinary (Join-Path $projectDir 'server.cjs') $port --open
