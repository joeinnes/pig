#!/usr/bin/env bash
set -euo pipefail

TAP_DIR="/opt/homebrew/Library/Taps/joeinnes/homebrew-tap"
FORMULA="${TAP_DIR}/Formula/pig.rb"

# ── preflight ─────────────────────────────────────────────────────────────────

if ! git diff --quiet HEAD; then
  echo "error: working tree is dirty — commit or stash first" >&2; exit 1
fi

VERSION=$(node -p "require('./package.json').version")
TARBALL="pig-${VERSION}.tar.gz"

echo "releasing pig v${VERSION}..."

# ── tests ─────────────────────────────────────────────────────────────────────

echo "running tests..."
pnpm test

# ── build ─────────────────────────────────────────────────────────────────────

echo "building..."
pnpm build

# ── tarball ───────────────────────────────────────────────────────────────────

echo "creating tarball..."
mkdir -p .release
cp dist/index.js .release/pig
chmod +x .release/pig
tar -czf "${TARBALL}" -C .release pig
rm -rf .release

SHA=$(shasum -a 256 "${TARBALL}" | awk '{print $1}')
echo "sha256: ${SHA}"

# ── tag + push ────────────────────────────────────────────────────────────────

echo "tagging v${VERSION}..."
git tag "v${VERSION}"
git push origin main --tags

# ── github release ────────────────────────────────────────────────────────────

echo "creating github release..."
gh release create "v${VERSION}" "${TARBALL}" \
  --title "pig v${VERSION}" \
  --notes "pig v${VERSION}"

rm "${TARBALL}"

# ── tap formula ───────────────────────────────────────────────────────────────

URL="https://github.com/joeinnes/pig/releases/download/v${VERSION}/${TARBALL}"

echo "updating tap formula..."
sed -i '' \
  -e "s|url \".*\"|url \"${URL}\"|" \
  -e "s|sha256 \".*\"|sha256 \"${SHA}\"|" \
  -e "s|version \".*\"|version \"${VERSION}\"|" \
  "${FORMULA}"

git -C "${TAP_DIR}" add Formula/pig.rb
git -C "${TAP_DIR}" commit -m "pig: update to v${VERSION}"
git -C "${TAP_DIR}" push

echo "done. pig v${VERSION} released."
echo "install with: brew install joeinnes/tap/pig"
