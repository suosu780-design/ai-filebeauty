# Backup to GitHub. Run: gh auth login  (once), then:  .\push-github.ps1
# Uses ASCII-only messages so Windows PowerShell does not choke on encoding.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$repoName = "ai-filebeauty"
$owner = "suosu780-design"
$remoteUrl = "https://github.com/${owner}/${repoName}.git"

Write-Host ""
Write-Host "[1/3] Checking GitHub CLI..." -ForegroundColor Cyan
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "Install gh: winget install GitHub.cli" -ForegroundColor Red
  exit 1
}

Write-Host "[2/3] Checking gh auth..." -ForegroundColor Cyan
gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Not logged in. Run:  gh auth login" -ForegroundColor Yellow
  Write-Host "Then run this script again." -ForegroundColor Yellow
  exit 1
}

Write-Host "[3/3] Create repo (if needed) and push..." -ForegroundColor Cyan

$hasRemote = $false
try {
  git remote get-url origin 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $hasRemote = $true }
} catch { }

if (-not $hasRemote) {
  gh repo create $repoName --private --source=. --remote=origin --push 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Done: https://github.com/${owner}/${repoName}" -ForegroundColor Green
    git push origin v1.0 2>$null
    exit 0
  }
  Write-Host ""
  Write-Host "gh repo create failed (repo may exist). Adding origin and pushing..." -ForegroundColor Yellow
  git remote remove origin 2>$null
  git remote add origin $remoteUrl
}

git branch -M main
git push -u origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "git push failed. Check account $owner and HTTPS credentials." -ForegroundColor Red
  exit 1
}

git push origin v1.0 2>$null

Write-Host ""
Write-Host "Done: https://github.com/${owner}/${repoName}" -ForegroundColor Green
