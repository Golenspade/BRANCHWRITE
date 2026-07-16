use std::ffi::OsString;
use std::sync::Mutex;
use tempfile::TempDir;

static HOME_LOCK: Mutex<()> = Mutex::new(());
const LIB_SOURCE: &str = include_str!("../src/lib.rs");
const COMMANDS_SOURCE: &str = include_str!("../src/persistence/commands.rs");

#[test]
fn e2e_override_uses_an_isolated_identifier_and_documents_artifact_locations() {
    let manifest = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let repository = manifest.parent().unwrap();
    let config_path = manifest.join("tauri.e2e.conf.json");
    let guide_path = manifest.join("E2E_DESKTOP.md");
    let script_path = repository.join("scripts/build-desktop-e2e.sh");
    assert!(config_path.is_file(), "missing {}", config_path.display());
    assert!(guide_path.is_file(), "missing {}", guide_path.display());
    assert!(script_path.is_file(), "missing {}", script_path.display());

    let base: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(manifest.join("tauri.conf.json")).unwrap(),
    )
    .unwrap();
    let override_config: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(config_path).unwrap()).unwrap();
    assert_eq!(base["identifier"], "com.branchwrite.app");
    assert_eq!(override_config["identifier"], "com.branchwrite.e2e");
    assert_eq!(override_config["productName"], "BranchWrite E2E");

    let guide = std::fs::read_to_string(guide_path).unwrap();
    let script = std::fs::read_to_string(script_path).unwrap();
    for required in [
        "./scripts/build-desktop-e2e.sh",
        "com.branchwrite.e2e",
        "branchwrite-v2.sqlite3",
        "Library/Application Support/com.branchwrite.e2e",
        "Library/Logs/com.branchwrite.e2e",
    ] {
        assert!(
            guide.contains(required),
            "desktop E2E guide misses {required}"
        );
    }
    for required in [
        "rust-toolchain.toml",
        "rustup which --toolchain",
        "export PATH=",
        "bun run tauri build --debug --bundles app --config src-tauri/tauri.e2e.conf.json",
        "src-tauri/target/debug/bundle/macos/BranchWrite E2E.app",
        "Print :CFBundleIdentifier",
        "Print :CFBundleName",
        "com.branchwrite.e2e",
        "BranchWrite E2E",
    ] {
        assert!(script.contains(required), "build verifier misses {required}");
    }
    assert!(!guide.contains("tauri build -- --debug"));
    assert!(!script.contains("tauri build -- --debug"));
}

#[test]
fn production_exit_explicitly_shuts_down_and_joins_the_typed_worker() {
    for required in [
        ".run(|app_handle, event|",
        "tauri::RunEvent::Exit",
        ".shutdown_blocking()",
    ] {
        assert!(LIB_SOURCE.contains(required), "exit path misses {required}");
    }
    assert!(
        COMMANDS_SOURCE.contains("State<'_, PersistenceWorker>"),
        "typed command state must remain PersistenceWorker"
    );
    assert!(!COMMANDS_SOURCE.contains("Mutex<Connection>"));
}

struct HomeGuard(Option<OsString>);

impl Drop for HomeGuard {
    fn drop(&mut self) {
        match self.0.take() {
            Some(home) => std::env::set_var("HOME", home),
            None => std::env::remove_var("HOME"),
        }
    }
}

#[test]
fn production_builder_leaves_an_isolated_legacy_tree_untouched() {
    let _lock = HOME_LOCK.lock().unwrap();
    let temp = TempDir::new().unwrap();
    let legacy_root = temp.path().join(".branchwrite");
    std::fs::create_dir(&legacy_root).unwrap();
    let sentinel = legacy_root.join("sentinel.txt");
    std::fs::write(&sentinel, "preserve me").unwrap();
    let _home = HomeGuard(std::env::var_os("HOME"));
    std::env::set_var("HOME", temp.path());

    let builder = app_lib::active_builder();
    drop(builder);

    assert_eq!(std::fs::read_to_string(sentinel).unwrap(), "preserve me");
    assert!(!legacy_root.join("projects").exists());
    assert!(!legacy_root.join("books").exists());
}

#[test]
fn production_registration_excludes_every_legacy_state_command() {
    for forbidden in [
        ".manage(AppState::new()",
        "commands::create_project,",
        "commands::save_project,",
        "commands::load_project,",
        "commands::list_projects,",
        "commands::delete_project,",
        "commands::export_project,",
        "commands::get_project_stats,",
        "commands::get_app_data_dir,",
    ] {
        assert!(
            !LIB_SOURCE.contains(forbidden),
            "active startup still contains {forbidden}"
        );
    }
}

#[test]
fn production_registers_all_fifteen_typed_persistence_commands() {
    for required in [
        "list_books",
        "get_book",
        "create_book",
        "update_book",
        "delete_book",
        "list_documents",
        "get_document",
        "create_document",
        "update_document_metadata",
        "save_document",
        "delete_document",
        "list_versions",
        "get_version",
        "create_version",
        "restore_version",
    ] {
        let registration = format!("persistence::commands::{required},");
        assert!(
            LIB_SOURCE.contains(&registration),
            "missing typed command registration {required}"
        );
    }
}
