<#
    push.ps1 - 최초 커밋 & GitHub 푸시 헬퍼

    사용법
        .\push.ps1 -Remote https://github.com/<사용자명>/earth-quiz-chatbot.git
        .\push.ps1 -Remote git@github.com:<사용자명>/earth-quiz-chatbot.git -Branch main

    하는 일
        1) 커밋 전 API 키 유출 검사 (걸리면 중단)
        2) 이 폴더를 독립 git 저장소로 초기화 (이미 있으면 건너뜀)
        3) 원격 등록 후 커밋 & 푸시

    주의
        상위 폴더 'C:\2026 My Project' 전체가 커밋 0개짜리 git 저장소입니다.
        이 스크립트는 여기(earth-quiz-chatbot)에 별도 저장소를 만들어,
        다른 프로젝트가 함께 올라가지 않도록 합니다.
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Remote,

    [string]$Branch = "main",

    [string]$Message = "지구퀴즈 봇: 카카오톡 기반 지구과학 복습 챗봇 (2024)"
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Fail($text) {
    Write-Host "[중단] $text" -ForegroundColor Red
    exit 1
}
function Step($text) {
    Write-Host "`n==> $text" -ForegroundColor Cyan
}

# ── 1. 유출 검사 ──────────────────────────────────────────────
Step "커밋 대상에 비밀값이 없는지 검사합니다"

$tracked = @("bots", "data", "tools", "docs", "README.md", "push.ps1", ".gitignore")
$targets = Get-ChildItem -Path $tracked -Recurse -File -ErrorAction SilentlyContinue

# Google API 키 형식: AIza + 35자
$leaks = $targets | Select-String -Pattern "AIza[0-9A-Za-z_\-]{35}" -ErrorAction SilentlyContinue
if ($leaks) {
    Write-Host "실제 API 키로 보이는 문자열이 발견됐습니다:" -ForegroundColor Red
    $leaks | ForEach-Object { Write-Host ("  {0}:{1}" -f $_.Path, $_.LineNumber) -ForegroundColor Red }
    Fail "해당 값을 플레이스홀더로 바꾼 뒤 다시 실행하세요."
}
Write-Host "  통과 - 하드코딩된 키 없음" -ForegroundColor Green

# 런타임 상태 파일이 실수로 추적되지 않는지 확인
$runtimeLeak = Get-ChildItem -Path "data\runtime" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notlike "*.example.json" }
if ($runtimeLeak) {
    Write-Host "  참고: data\runtime 에 실행 중 생성된 파일이 있습니다 (.gitignore 로 제외됨)" -ForegroundColor Yellow
    $runtimeLeak | ForEach-Object { Write-Host ("    - {0}" -f $_.Name) -ForegroundColor DarkGray }
}

# ── 2. 저장소 초기화 ──────────────────────────────────────────
if (Test-Path ".git") {
    Step "이미 git 저장소입니다 - 초기화를 건너뜁니다"
} else {
    Step "이 폴더를 독립 git 저장소로 초기화합니다"
    git init -b $Branch
    if (-not $?) { Fail "git init 실패" }
}

# 커밋 작성자 정보 확인
$userName = git config user.name
if ([string]::IsNullOrWhiteSpace($userName)) {
    Fail "git 사용자 정보가 없습니다. 먼저 설정하세요:`n  git config --global user.name `"이름`"`n  git config --global user.email `"메일주소`""
}

# ── 3. 원격 등록 ──────────────────────────────────────────────
Step "원격 저장소를 등록합니다: $Remote"
$existing = git remote get-url origin 2>$null
if ([string]::IsNullOrWhiteSpace($existing)) {
    git remote add origin $Remote
} else {
    Write-Host "  기존 origin($existing) 을 덮어씁니다" -ForegroundColor Yellow
    git remote set-url origin $Remote
}

# ── 4. 스테이징 & 확인 ────────────────────────────────────────
Step "변경 사항을 스테이징합니다"
git add -A

$staged = git diff --cached --name-only
if ([string]::IsNullOrWhiteSpace($staged)) { Fail "커밋할 변경 사항이 없습니다." }

$count = ($staged -split "`n" | Where-Object { $_ -ne "" }).Count
Write-Host "  파일 $count 개" -ForegroundColor Green

# 원본 폴더가 섞여 들어가지 않았는지 최종 확인
if ($staged -match "나의 프로젝트") {
    Fail "'나의 프로젝트/' (실명·대화 로그 포함)가 스테이징됐습니다. .gitignore 를 확인하세요."
}

Write-Host "`n다음 파일이 GitHub에 공개됩니다:" -ForegroundColor Cyan
$staged -split "`n" | Where-Object { $_ -ne "" } | Select-Object -First 25 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
if ($count -gt 25) { Write-Host ("  ... 외 {0}개" -f ($count - 25)) -ForegroundColor DarkGray }

$answer = Read-Host "`n계속할까요? (y/N)"
if ($answer -ne "y") { Fail "사용자가 취소했습니다." }

# ── 5. 커밋 & 푸시 ────────────────────────────────────────────
Step "커밋합니다"
git commit -m $Message
if (-not $?) { Fail "커밋 실패" }

Step "푸시합니다 (origin/$Branch)"
git push -u origin $Branch
if (-not $?) { Fail "푸시 실패. 원격 저장소가 존재하고 권한이 있는지 확인하세요." }

Write-Host "`n완료. $Remote" -ForegroundColor Green
