#!/usr/bin/env bash
#
# 去識別化 gate（結構型）：掃描整個 repo，命中任一「疑似內部資訊」的格式即失敗。
#
#   本機：  bash scripts/deidentify-gate.sh
#   CI：    .github/workflows/deidentify-gate.yml 會呼叫本腳本
#
# 這個 gate 只檢查「格式」不檢查「特定字」——它本身不含任何真實識別資訊，
# 適合放在公開 repo。完整的字面對照清單是維護者的私有工具，不隨附於此。
#
# 命中時請改字。若確認是誤判（例如某段 SVG path 座標剛好像 IP），
# 在下方 ALLOWLIST 補一條精確的排除規則，不要放寬偵測 pattern。
set -uo pipefail
cd "$(dirname "$0")/.."

# --- 偵測規則（extended regex）------------------------------------------------
PATTERNS=(
  # 私有網段 IP（RFC1918）——內網位址不該出現在原始碼
  '\b10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\b'
  '\b192\.168\.[0-9]{1,3}\.[0-9]{1,3}\b'
  '\b172\.(1[6-9]|2[0-9]|3[01])\.[0-9]{1,3}\.[0-9]{1,3}\b'
  # ASP.NET 內部頁面路徑——需有檔名在 .aspx 前，排除純提及
  '[/A-Za-z0-9_-]+\.aspx\b'
  # Windows UNC 路徑
  '\\\\\\\\[A-Za-z0-9_.$-]+\\\\'
  # 疑似硬編密碼：關鍵字 = 帶引號的字面字串值
  '(password|passwd|pwd|secret|api[_-]?key)["'"'"' ]*[:=]["'"'"' ]*["'"'"'][A-Za-z0-9!@#$%^&*_-]{6,}["'"'"']'
)

# --- 允許清單（精確字串，用於排除已知誤判）---------------------------------
ALLOWLIST=(
  'process.env'
  'JWT_SECRET'
  'PASSPORT_SECRET'
  'your_password'
  'DB_PASSWORD='
  '<your-'
  'demo1234'                     # demo 帳號密碼，README 明列，非機密
  'changeme'
)

# --- email：抓所有 email，排除公開/範例網域 --------------------------------
EMAIL_RE='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
EMAIL_ALLOW='@(example\.(com|org|net)|test\.com|localhost|users\.noreply\.github\.com)([^A-Za-z0-9.-]|$)|deeyo0312@gmail\.com'

SCAN_ARGS=(
  -rniE
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=build
  --exclude-dir=dist --exclude-dir=venv --exclude-dir=coverage --exclude-dir=logs
  --exclude='.env' --exclude='.env.local'
  --exclude='*.png' --exclude='*.jpg' --exclude='*.jpeg' --exclude='*.gif'
  --exclude='*.svg' --exclude='*.ico' --exclude='*.pdf'
  --exclude='*.woff' --exclude='*.woff2' --exclude='*.ttf' --exclude='*.eot'
  --exclude='*.lock' --exclude='package-lock.json'
  --exclude='deidentify-gate.sh'
)

fail=0

run_pattern() {
  local re="$1" hits
  hits=$(grep "${SCAN_ARGS[@]}" "$re" . || true)
  [ -z "$hits" ] && return
  # 逐行過濾 allowlist
  local filtered=""
  while IFS= read -r line; do
    local skip=0
    for a in "${ALLOWLIST[@]}"; do
      [[ "$line" == *"$a"* ]] && { skip=1; break; }
    done
    [ "$skip" -eq 0 ] && filtered+="$line"$'\n'
  done <<< "$hits"
  if [ -n "${filtered// /}" ] && [ "$filtered" != $'\n' ]; then
    echo "❌ 命中格式規則：$re"
    echo "$filtered"
    fail=1
  fi
}

for re in "${PATTERNS[@]}"; do run_pattern "$re"; done

# email 專門處理
email_hits=$(grep "${SCAN_ARGS[@]}" "$EMAIL_RE" . || true)
if [ -n "$email_hits" ]; then
  bad=$(echo "$email_hits" | grep -viE "$EMAIL_ALLOW" || true)
  if [ -n "$bad" ]; then
    echo "❌ 發現非公開/範例網域的 email："
    echo "$bad"
    fail=1
  fi
fi

if [ "$fail" -ne 0 ]; then
  echo "----------------------------------------"
  echo "請改掉上列內容（內網位址、內部頁面、硬編密碼、非公開 email）。"
  exit 1
fi

echo "✅ 去識別化 gate（結構型）通過"
