# BranchWrite desktop E2E fixture

The desktop E2E build has its own macOS bundle identifier,
`com.branchwrite.e2e`. Tauri therefore gives it an app-data directory that is
isolated from the production `com.branchwrite.app` application.

From the repository root, build and verify the debug application with:

```sh
./scripts/build-desktop-e2e.sh
```

The script invokes Tauri as `bun run tauri build --debug --bundles app
--config src-tauri/tauri.e2e.conf.json`. Tauri CLI options deliberately appear
before any runner-argument delimiter. After building, the script reads the
application's `Info.plist` and fails unless the product name is
`BranchWrite E2E` and the bundle identifier is `com.branchwrite.e2e`.
It reads the pinned channel from `rust-toolchain.toml`, resolves that toolchain
through `rustup`, and prepends its binary directory itself; callers do not need
to repair a conflicting system `cargo` or `rustc` path manually.

The resulting application is:

```text
src-tauri/target/debug/bundle/macos/BranchWrite E2E.app
```

On macOS, all database evidence for this build is under:

```text
~/Library/Application Support/com.branchwrite.e2e
```

The database path is deterministic:

```text
~/Library/Application Support/com.branchwrite.e2e/branchwrite-v2.sqlite3
```

Debug builds install the Tauri log plugin. Its Rust log evidence is under:

```text
~/Library/Logs/com.branchwrite.e2e
```

Before an empty-database run, make sure no `BranchWrite E2E` process is
running, preserve any evidence needed from the preceding run, and remove only
the E2E app-data directory. Never remove or inspect the production identifier's
directory as part of E2E setup.
