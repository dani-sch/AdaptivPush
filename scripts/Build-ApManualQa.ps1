$ErrorActionPreference = 'Stop'
$apRepo = Split-Path $PSScriptRoot -Parent
Push-Location $apRepo
try {
    if (git status --porcelain) { throw 'Build requires a clean committed checkout.' }
    $apCommit = (git rev-parse HEAD).Trim()
    $apStatus = (& .\node_modules\.bin\supabase.cmd status --output json 2>$null | ConvertFrom-Json)
    if ($apStatus.API_URL -ne 'http://127.0.0.1:54321') { throw 'Expected local Supabase backend.' }
    $env:EXPO_NO_DOTENV='1'; $env:CI='1'
    $env:EXPO_PUBLIC_SUPABASE_URL='http://127.0.0.1:54329'
    $env:EXPO_PUBLIC_SUPABASE_KEY=$apStatus.ANON_KEY
    $env:JAVA_HOME='C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot'
    $env:ANDROID_HOME=Join-Path $env:LOCALAPPDATA 'Android/Sdk'
    $env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
    $apEvidence=Join-Path $env:LOCALAPPDATA 'AdaptivPush/release-evidence/2026-09-14'
    New-Item -ItemType Directory -Path $apEvidence -Force | Out-Null
    $apArtifacts=@()
    Push-Location android
    try {
        foreach($apVariant in @('enabled','disabled')) {
            $apFlag=($apVariant -eq 'enabled').ToString().ToLowerInvariant()
            $env:EXPO_PUBLIC_AP02_DURABLE_WRITER=$apFlag
            $env:EXPO_PUBLIC_AP03_ATOMIC_WRITER=$apFlag
            $apBuildId="$($apCommit.Substring(0,7))-$apVariant"
            $apLog=Join-Path $apEvidence "$apBuildId-build.log"
            & .\gradlew.bat :app:assembleDebug -I ..\scripts\manualQaDebugBundle.gradle --no-daemon --console=plain *> $apLog
            if ($LASTEXITCODE -ne 0) { throw "Build failed; inspect $apLog" }
            $apArtifact=Join-Path $apEvidence "$apBuildId.apk"
            Copy-Item -LiteralPath app/build/outputs/apk/debug/app-debug.apk -Destination $apArtifact
            $apArtifacts+=@{id=$apBuildId;path=$apArtifact;sha256=(Get-FileHash -LiteralPath $apArtifact).Hash;writerFlags=$apFlag;embeddedBundle=$true}
            Write-Host "PASS $apBuildId native debug with embedded local bundle"
        }
    } finally { Pop-Location }
    if ($apArtifacts[0].sha256 -eq $apArtifacts[1].sha256) { throw 'Flag variants are identical. Do not hand off cached bundles.' }
    @{commit=$apCommit;platform='Android';backend='http://127.0.0.1:54329';upstream='http://127.0.0.1:54321';applicationId='com.dani.sch.tempapp';versionName='1.0.0';versionCode=1;artifacts=$apArtifacts} |
        ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $apEvidence "$($apCommit.Substring(0,7))-build-manifest.json")
} finally {
    foreach($apName in @('EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_KEY','EXPO_PUBLIC_AP02_DURABLE_WRITER','EXPO_PUBLIC_AP03_ATOMIC_WRITER','EXPO_NO_DOTENV')) {
        [Environment]::SetEnvironmentVariable($apName,$null,'Process')
    }
    Pop-Location
}
