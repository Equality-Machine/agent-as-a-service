#!/usr/bin/env bash
set -euo pipefail

DEFAULT_REPO="https://github.com/Equality-Machine/agent-as-a-service.git"
DEFAULT_CLOUD_URL="https://aaas-agent-service.b4yesc4t.chatgpt.site"

ROLE="${AAAS_ROLE:-consumer}"
CLIENT="${AAAS_CLIENT:-auto}"
CLOUD_URL="${AAAS_CLOUD_URL:-$DEFAULT_CLOUD_URL}"
INSTALL_DIR="${AAAS_INSTALL_DIR:-$HOME/.local/share/aaas}"
DATA_DIR="${AAAS_DATA_DIR:-$HOME/.aaas}"
RUNTIME_DIR="${AAAS_RUNTIME_DIR:-$HOME/.local/share/aaas-runtime}"
REPO_URL="${AAAS_REPO_URL:-$DEFAULT_REPO}"
REF="${AAAS_REF:-main}"
SOURCE_DIR="${AAAS_SOURCE_DIR:-}"
START_RUNNER=1

usage() {
  cat <<'EOF'
Efflora Agent as a Service one-command installer

Usage:
  curl -fsSL https://raw.githubusercontent.com/Equality-Machine/agent-as-a-service/main/install.sh | bash
  bash install.sh [options]

Roles:
  consumer   Install Skill + MCP only; no Runner (default).
  publisher  Install Skill + MCP and a persistent local Runner.
  runner     Install a persistent remote/server Runner only.

Options:
  --role ROLE          consumer, publisher, or runner
  --client CLIENT      auto, codex, claude, both, or none
  --cloud-url URL      AaaS control-plane URL
  --install-dir PATH   Project installation directory
  --data-dir PATH      Runner/publisher state directory
  --repo URL           Git repository URL
  --ref REF            Git branch or tag (default: main)
  --source-dir PATH    Use an existing checkout instead of cloning
  --no-start           Install the Runner service file without starting it
  -h, --help           Show this help

A consumer can later say "发布当前对话". The Skill checks runner_status and,
after explicit confirmation, calls install_local_runner to promote the machine
to a publisher.
EOF
}

while (($#)); do
  case "$1" in
    --role) ROLE="$2"; shift 2 ;;
    --client) CLIENT="$2"; shift 2 ;;
    --cloud-url) CLOUD_URL="$2"; shift 2 ;;
    --install-dir) INSTALL_DIR="$2"; shift 2 ;;
    --data-dir) DATA_DIR="$2"; shift 2 ;;
    --repo) REPO_URL="$2"; shift 2 ;;
    --ref) REF="$2"; shift 2 ;;
    --source-dir) SOURCE_DIR="$2"; shift 2 ;;
    --no-start) START_RUNNER=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$ROLE" in
  consumer|publisher|runner) ;;
  *) echo "--role must be consumer, publisher, or runner" >&2; exit 2 ;;
esac

case "$CLIENT" in
  auto|codex|claude|both|none) ;;
  *) echo "--client must be auto, codex, claude, both, or none" >&2; exit 2 ;;
esac

if [[ -n "$SOURCE_DIR" ]]; then
  PROJECT_DIR="$(cd "$SOURCE_DIR" && pwd)"
else
  if ! command -v git >/dev/null 2>&1; then
    echo "git is required to install AaaS. Install Git, then rerun this command." >&2
    exit 1
  fi
  mkdir -p "$(dirname "$INSTALL_DIR")"
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    if [[ -n "$(git -C "$INSTALL_DIR" status --porcelain)" ]]; then
      echo "AaaS install directory has local changes: $INSTALL_DIR" >&2
      echo "Move those changes or choose another --install-dir." >&2
      exit 1
    fi
    git -C "$INSTALL_DIR" fetch --depth 1 origin "$REF"
    git -C "$INSTALL_DIR" checkout --detach FETCH_HEAD
  elif [[ -e "$INSTALL_DIR" ]]; then
    echo "Install path exists but is not an AaaS Git checkout: $INSTALL_DIR" >&2
    exit 1
  else
    git clone --depth 1 --branch "$REF" "$REPO_URL" "$INSTALL_DIR"
  fi
  PROJECT_DIR="$(cd "$INSTALL_DIR" && pwd)"
fi

node_is_compatible() {
  command -v node >/dev/null 2>&1 &&
    [[ "$(node -p 'Number(process.versions.node.split(".")[0]) >= 22 ? "yes" : "no"' 2>/dev/null)" == "yes" ]]
}

install_portable_node() {
  if ! command -v curl >/dev/null 2>&1 || ! command -v tar >/dev/null 2>&1; then
    echo "Node.js 22+ is missing, and curl/tar are required for automatic setup." >&2
    exit 1
  fi

  local os_name arch_name suffix checksums archive expected actual temp extracted
  case "$(uname -s)" in
    Darwin) os_name="darwin" ;;
    Linux) os_name="linux" ;;
    *) echo "Automatic Node.js setup supports only macOS and Linux." >&2; exit 1 ;;
  esac
  case "$(uname -m)" in
    arm64|aarch64) arch_name="arm64" ;;
    x86_64|amd64) arch_name="x64" ;;
    *) echo "Unsupported CPU architecture: $(uname -m)" >&2; exit 1 ;;
  esac

  temp="$(mktemp -d)"
  trap 'rm -rf "$temp"' RETURN
  checksums="$temp/SHASUMS256.txt"
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt" -o "$checksums"
  suffix="${os_name}-${arch_name}.tar.gz"
  archive="$(awk -v suffix="$suffix" '$2 ~ suffix "$" { print $2; exit }' "$checksums")"
  if [[ -z "$archive" ]]; then
    echo "Could not find a Node.js 22 build for $suffix." >&2
    exit 1
  fi
  expected="$(awk -v archive="$archive" '$2 == archive { print $1; exit }' "$checksums")"
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$archive" -o "$temp/$archive"
  if command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "$temp/$archive" | awk '{ print $1 }')"
  elif command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "$temp/$archive" | awk '{ print $1 }')"
  else
    echo "A SHA-256 utility is required to verify Node.js." >&2
    exit 1
  fi
  if [[ "$actual" != "$expected" ]]; then
    echo "Node.js archive checksum verification failed." >&2
    exit 1
  fi

  tar -xzf "$temp/$archive" -C "$temp"
  extracted="$temp/${archive%.tar.gz}"
  mkdir -p "$RUNTIME_DIR"
  if [[ -e "$RUNTIME_DIR/node" ]]; then
    mv "$RUNTIME_DIR/node" "$RUNTIME_DIR/node.previous.$(date +%s)"
  fi
  mv "$extracted" "$RUNTIME_DIR/node"
  NODE_BIN="$RUNTIME_DIR/node/bin/node"
  trap - RETURN
  rm -rf "$temp"
}

if node_is_compatible; then
  NODE_BIN="$(command -v node)"
else
  echo "Node.js 22+ not found; installing a verified portable runtime..."
  install_portable_node
fi

INSTALL_ARGS=(
  "$PROJECT_DIR/scripts/install.mjs"
  --role "$ROLE"
  --client "$CLIENT"
  --cloud-url "$CLOUD_URL"
  --data-dir "$DATA_DIR"
)
if [[ "$START_RUNNER" == "0" ]]; then
  INSTALL_ARGS+=(--no-start)
fi

"$NODE_BIN" "${INSTALL_ARGS[@]}"

echo
echo "AaaS setup complete."
echo "  Role: $ROLE"
echo "  Project: $PROJECT_DIR"
echo "  Control plane: $CLOUD_URL"
