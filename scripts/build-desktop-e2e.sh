#!/usr/bin/env bash

set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_PATH="$REPOSITORY_ROOT/src-tauri/target/debug/bundle/macos/BranchWrite E2E.app"
PLIST_PATH="$APP_PATH/Contents/Info.plist"
TOOLCHAIN="$(sed -n 's/^channel = "\([^"]*\)"/\1/p' "$REPOSITORY_ROOT/rust-toolchain.toml")"

test -n "$TOOLCHAIN"
TOOLCHAIN_CARGO="$(rustup which --toolchain "$TOOLCHAIN" cargo)"
TOOLCHAIN_BIN="$(dirname "$TOOLCHAIN_CARGO")"
export PATH="$TOOLCHAIN_BIN:$PATH"
export RUSTC="$(rustup which --toolchain "$TOOLCHAIN" rustc)"
export RUSTDOC="$(rustup which --toolchain "$TOOLCHAIN" rustdoc)"

cd "$REPOSITORY_ROOT"
bun run tauri build --debug --bundles app --config src-tauri/tauri.e2e.conf.json

test -d "$APP_PATH"
test -f "$PLIST_PATH"

BUNDLE_IDENTIFIER="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$PLIST_PATH")"
PRODUCT_NAME="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleName' "$PLIST_PATH")"

test "$BUNDLE_IDENTIFIER" = "com.branchwrite.e2e"
test "$PRODUCT_NAME" = "BranchWrite E2E"

printf 'E2E_APP_PATH=%s\n' "$APP_PATH"
printf 'E2E_RUST_TOOLCHAIN=%s\n' "$TOOLCHAIN"
printf 'E2E_BUNDLE_IDENTIFIER=%s\n' "$BUNDLE_IDENTIFIER"
printf 'E2E_PRODUCT_NAME=%s\n' "$PRODUCT_NAME"
printf 'E2E_DB_PATH=%s\n' "$HOME/Library/Application Support/com.branchwrite.e2e/branchwrite-v2.sqlite3"
printf 'E2E_LOG_DIR=%s\n' "$HOME/Library/Logs/com.branchwrite.e2e"
