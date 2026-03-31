# 一键备份到 GitHub（需先完成一次 gh 登录，见下方）
# 用法：在资源管理器中右键「使用 PowerShell 运行」，或在终端执行：
#   cd 本目录
#   .\push-github.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$repoName = "ai-filebeauty"
$owner = "suosu780-design"
$remoteUrl = "https://github.com/${owner}/${repoName}.git"

Write-Host "`n[1/3] 检查 GitHub CLI..." -ForegroundColor Cyan
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "未安装 gh。请安装: winget install GitHub.cli" -ForegroundColor Red
  exit 1
}

Write-Host "[2/3] 检查是否已登录 GitHub..." -ForegroundColor Cyan
gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host @"

尚未登录。请在本窗口**先执行**下面一条命令，按提示用浏览器完成授权（约 30 秒）：

    gh auth login

选：GitHub.com → HTTPS → Login with a web browser
完成后再运行本脚本：  .\push-github.ps1

"@ -ForegroundColor Yellow
  exit 1
}

Write-Host "[3/3] 创建远程仓库并推送..." -ForegroundColor Cyan

$hasRemote = $false
try {
  git remote get-url origin 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $hasRemote = $true }
} catch { }

if (-not $hasRemote) {
  gh repo create $repoName --private --source=. --remote=origin --push 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "`n完成。仓库地址: https://github.com/${owner}/${repoName}" -ForegroundColor Green
    exit 0
  }
  Write-Host "`n自动创建失败（可能仓库已存在）。尝试添加 remote 并推送..." -ForegroundColor Yellow
  git remote remove origin 2>$null
  git remote add origin $remoteUrl
}

git branch -M main
git push -u origin main
if ($LASTEXITCODE -eq 0) {
  Write-Host "`n完成。仓库地址: https://github.com/${owner}/${repoName}" -ForegroundColor Green
} else {
  Write-Host "`n推送失败。若提示无权限，请确认 GitHub 账号为 ${owner}，或检查 token 权限含 repo。" -ForegroundColor Red
  exit 1
}
