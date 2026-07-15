use std::ffi::OsString;
use std::sync::Mutex;
use tempfile::TempDir;

static HOME_LOCK: Mutex<()> = Mutex::new(());
const LIB_SOURCE: &str = include_str!("../src/lib.rs");

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
fn production_registers_all_eleven_typed_persistence_commands() {
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
    ] {
        let registration = format!("persistence::commands::{required},");
        assert!(
            LIB_SOURCE.contains(&registration),
            "missing typed command registration {required}"
        );
    }
}
