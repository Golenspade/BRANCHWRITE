mod commands;
mod file_system;
pub mod persistence;

use persistence::dto::{PersistenceError, PersistenceErrorCode};
use persistence::state::PersistenceState;
use tauri::Manager;

pub fn active_builder() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::select_folder,
            commands::select_file,
            commands::show_message,
            commands::file_exists,
            commands::create_directory,
            commands::read_file,
            commands::write_file,
            commands::get_file_info,
            commands::list_directory,
            commands::get_documents_dir,
            commands::get_desktop_dir,
            persistence::commands::list_books,
            persistence::commands::get_book,
            persistence::commands::create_book,
            persistence::commands::update_book,
            persistence::commands::delete_book,
            persistence::commands::list_documents,
            persistence::commands::get_document,
            persistence::commands::create_document,
            persistence::commands::update_document_metadata,
            persistence::commands::save_document,
            persistence::commands::delete_document,
            persistence::commands::list_versions,
            persistence::commands::get_version,
            persistence::commands::create_version,
            persistence::commands::restore_version,
        ])
}

fn app_data_unavailable() -> PersistenceError {
    PersistenceError::new(
        PersistenceErrorCode::StorageUnavailable,
        "persistence storage is unavailable",
        false,
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = active_builder()
        .setup(|app| {
            let persistence = match app.path().app_data_dir() {
                Ok(app_data_dir) => PersistenceState::start(app_data_dir),
                Err(_) => PersistenceState::failed(app_data_unavailable()),
            };
            app.manage(persistence);
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");
    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            if let Err(error) = app_handle.state::<PersistenceState>().shutdown_blocking() {
                log::error!("failed to shut down persistence worker: {}", error.message);
            }
        }
    });
}
