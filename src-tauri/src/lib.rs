use tauri::{Manager, Emitter};

pub mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
                
                // Forward deep-link args to the main window
                for arg in args {
                    if arg.starts_with("krigzis://") || arg.starts_with("nexus://") {
                        let _ = w.emit("single-instance-deep-link", arg);
                        break;
                    }
                }
            }
        }))
        .setup(|_app| {
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::sysinfo::get_system_info,
            commands::logging::get_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
