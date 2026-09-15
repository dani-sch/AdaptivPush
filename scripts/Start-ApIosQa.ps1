param(
    [Parameter(Mandatory)][string]$ExpectedCommit,
    [Parameter(Mandatory)][string]$LanAddress,
    [ValidateSet('Enabled','Disabled')][string]$Writers = 'Enabled',
    [int]$MetroPort = 8082,
    [int]$ProxyPort = 54330,
    [switch]$ExportOnly
)
$ErrorActionPreference = 'Stop'
$apRepo = Split-Path $PSScriptRoot -Parent
$apNames = @('EXPO_NO_DOTENV','EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_KEY','EXPO_PUBLIC_AP02_DURABLE_WRITER','EXPO_PUBLIC_AP03_ATOMIC_WRITER','EXPO_PUBLIC_AP_QA_BUILD','REACT_NATIVE_PACKAGER_HOSTNAME','CI')
$apPrevious = @{}
foreach ($apName in $apNames) { $apPrevious[$apName] = [Environment]::GetEnvironmentVariable($apName,'Process') }
Push-Location $apRepo
try {
    if (git status --porcelain) { throw 'Commit source changes before binding this QA session.' }
    git diff --quiet $ExpectedCommit HEAD -- app components constants contexts features hooks lib types utils package.json package-lock.json index.js app.json
    if ($LASTEXITCODE -ne 0) { throw 'Application source differs from the requested commit.' }
    $apIp = Get-NetIPAddress -AddressFamily IPv4 | Where-Object IPAddress -eq $LanAddress
    if (-not $apIp -or $LanAddress -notmatch '^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)') { throw 'Supply this workstation private LAN IPv4 address.' }
    $apStatusText = & .\node_modules\.bin\supabase.cmd status --output json 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Start local Supabase first.' }
    $apStatus = ($apStatusText -join "`n") | ConvertFrom-Json
    if ($apStatus.API_URL -ne 'http://127.0.0.1:54321' -or -not $apStatus.ANON_KEY) { throw 'Unexpected local backend.' }
    $apSchema = 'select count(*) from supabase_migrations.schema_migrations where version in (''20260910210000'',''20260911120000'');' | docker exec -i supabase_db_AdaptivPush psql -X -qAt -U postgres -d postgres
    if ($LASTEXITCODE -ne 0 -or $apSchema.Trim() -ne '2') { throw 'Both reviewed local migrations are required.' }
    $apHealth = Invoke-RestMethod "http://${LanAddress}:$ProxyPort/__qa/health"
    if ($apHealth.service -ne 'AdaptivPush synthetic QA' -or $apHealth.upstream -ne 'local-only') { throw 'Start the LAN QA proxy first.' }
    $env:EXPO_NO_DOTENV = '1'
    $env:EXPO_PUBLIC_SUPABASE_URL = "http://${LanAddress}:$ProxyPort"
    $env:EXPO_PUBLIC_SUPABASE_KEY = $apStatus.ANON_KEY
    $env:EXPO_PUBLIC_AP02_DURABLE_WRITER = ($Writers -eq 'Enabled').ToString().ToLowerInvariant()
    $env:EXPO_PUBLIC_AP03_ATOMIC_WRITER = $env:EXPO_PUBLIC_AP02_DURABLE_WRITER
    $env:EXPO_PUBLIC_AP_QA_BUILD = "$ExpectedCommit/$Writers"
    $env:REACT_NATIVE_PACKAGER_HOSTNAME = $LanAddress
    # Expo 57 ignores reset-cache under CI; never carry transforms across variants.
    $env:CI = $null
    Write-Host "iOS QA $env:EXPO_PUBLIC_AP_QA_BUILD | backend $env:EXPO_PUBLIC_SUPABASE_URL | both writers $env:EXPO_PUBLIC_AP02_DURABLE_WRITER"
    if ($ExportOnly) {
        $apOutput = Join-Path $env:LOCALAPPDATA "AdaptivPush/release-evidence/2026-09-14/ios-remediation/$ExpectedCommit-$Writers"
        & .\node_modules\.bin\expo.cmd export --platform ios --clear --no-bytecode --no-minify --output-dir $apOutput
        if ($LASTEXITCODE -ne 0) { throw 'iOS export failed.' }
        $apMetadata = Get-Content (Join-Path $apOutput 'metadata.json') -Raw | ConvertFrom-Json
        $apBundlePath = Join-Path $apOutput $apMetadata.fileMetadata.ios.bundle
        $apBundle = [IO.File]::ReadAllText($apBundlePath)
        $apExpected = $env:EXPO_PUBLIC_AP02_DURABLE_WRITER
        if ($apBundle -notmatch "durableWorkoutWriter:\s*$apExpected\b" -or $apBundle -notmatch "atomicProgramWriter:\s*$apExpected\b" -or -not $apBundle.Contains($env:EXPO_PUBLIC_SUPABASE_URL)) {
            throw 'Rejected iOS bundle: embedded flags or backend do not match the requested variant.'
        }
        [ordered]@{ source=$ExpectedCommit; variant=$Writers; backend=$env:EXPO_PUBLIC_SUPABASE_URL; bothWriters=$apExpected; sha256=(Get-FileHash $apBundlePath).Hash; nativeDevicePass=$false } |
            ConvertTo-Json | Set-Content (Join-Path $apOutput 'qa-binding.json')
    } else {
        Write-Host "Open exp://${LanAddress}:$MetroPort in a compatible iOS Expo Go. This is a comparison session, not signed native release acceptance."
        & .\node_modules\.bin\expo.cmd start --lan --go --clear --port $MetroPort
    }
    if ($LASTEXITCODE -ne 0) { throw 'Expo QA command failed.' }
} finally {
    foreach ($apName in $apNames) { [Environment]::SetEnvironmentVariable($apName,$apPrevious[$apName],'Process') }
    Pop-Location
}
