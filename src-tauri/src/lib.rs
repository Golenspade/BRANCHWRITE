mod file_system;
mod commands;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .manage(AppState::new().expect("Failed to initialize app state"))
    .invoke_handler(tauri::generate_handler![
      commands::create_project,
      commands::save_project,
      commands::load_project,
      commands::list_projects,
      commands::delete_project,
      commands::export_project,
      commands::get_project_stats,
      commands::select_folder,
      commands::select_file,
      commands::show_message,
      commands::file_exists,
      commands::create_directory,
      commands::read_file,
      commands::write_file,
      commands::get_file_info,
      commands::list_directory,
      commands::get_app_data_dir,
      commands::get_documents_dir,
      commands::get_desktop_dir,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
