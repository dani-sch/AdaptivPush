param(
    [Parameter(Mandatory)][string]$ExpectedCommit,
    [ValidateSet('Enabled','Disabled')][string]$Writers = 'Enabled',
    [string]$DeviceSerial,
    [switch]$ServerOnly
)
$ErrorActionPreference = 'Stop'
$apRepo = Split-Path $PSScriptRoot -Parent
Push-Location $apRepo
try {
    if (git status --porcelain) { throw 'Commit or preserve your changes before launching this bound test build.' }
    git merge-base --is-ancestor $ExpectedCommit HEAD
    if ($LASTEXITCODE -ne 0) { throw 'Expected source commit is not in this checkout.' }
    git diff --quiet $ExpectedCommit HEAD -- app components constants contexts features hooks lib types utils package.json package-lock.json index.js app.json
    if ($LASTEXITCODE -ne 0) { throw 'Application source differs from the expected build. Rebuild before testing.' }
    $apStatusText = & .\node_modules\.bin\supabase.cmd status --output json 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Start the local Supabase stack first: npx supabase start' }
    $apStatus = ($apStatusText -join "`n") | ConvertFrom-Json
    if ($apStatus.API_URL -ne 'http://127.0.0.1:54321' -or -not $apStatus.ANON_KEY) { throw 'Unexpected local backend configuration.' }
    $env:EXPO_NO_DOTENV = '1'
    $env:EXPO_PUBLIC_SUPABASE_URL = $apStatus.API_URL
    $env:EXPO_PUBLIC_SUPABASE_KEY = $apStatus.ANON_KEY
    $env:EXPO_PUBLIC_AP02_DURABLE_WRITER = ($Writers -eq 'Enabled').ToString().ToLowerInvariant()
    $env:EXPO_PUBLIC_AP03_ATOMIC_WRITER = $env:EXPO_PUBLIC_AP02_DURABLE_WRITER
    if (-not $ServerOnly) {
        $apAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
        $apArgs = @()
        if ($DeviceSerial) { $apArgs = @('-s', $DeviceSerial) }
        & $apAdb @apArgs reverse tcp:54321 tcp:54321
        if ($LASTEXITCODE -ne 0) { throw 'Connect and authorize the physical Android phone; supply -DeviceSerial if multiple devices exist.' }
        & $apAdb @apArgs reverse tcp:8081 tcp:8081
        if ($LASTEXITCODE -ne 0) { throw 'Metro USB reverse mapping failed.' }
        & $apAdb @apArgs install -r (Join-Path $apRepo 'android\app\build\outputs\apk\debug\app-debug.apk')
        if ($LASTEXITCODE -ne 0) { throw 'Installing the local debug build failed.' }
    }
    Write-Host "Manual QA source: $ExpectedCommit | backend: local 127.0.0.1:54321 | writers: $Writers"
    Write-Host 'Keep this terminal open. Launch the installed temp-app on the phone after Metro is ready. Do not clear app storage during recovery tests.'
    & .\node_modules\.bin\expo.cmd start --localhost --clear
} finally {
    foreach ($apName in @('EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_KEY','EXPO_PUBLIC_AP02_DURABLE_WRITER','EXPO_PUBLIC_AP03_ATOMIC_WRITER','EXPO_NO_DOTENV')) {
        [Environment]::SetEnvironmentVariable($apName,$null,'Process')
    }
    Pop-Location
}
