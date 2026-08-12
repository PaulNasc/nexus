use std::fs::{self, File};
use std::io::Write;
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;
use tauri::AppHandle;
use tauri::Manager;
use tauri::Emitter;

fn hash_filename(name: &str) -> String {
    let mut hasher = DefaultHasher::new();
    name.hash(&mut hasher);
    let hash_val = hasher.finish();
    
    let ext = name.split('.').last().unwrap_or("mp4");
    let clean_ext = if ext.len() <= 4 && ext.chars().all(|c| c.is_alphanumeric()) { ext } else { "mp4" };
    
    format!("{:x}.{}", hash_val, clean_ext)
}

#[tauri::command]
pub async fn download_video_to_cache(app: AppHandle, url: String, filename: String) -> Result<String, String> {
    // 1. Get app data directory (Roaming on Windows - safe scope)
    let cache_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    // Create folder "nexus-videos" inside data directory
    let videos_dir = cache_dir.join("nexus-videos");
    if !videos_dir.exists() {
        fs::create_dir_all(&videos_dir)
            .map_err(|e| format!("Failed to create videos dir: {}", e))?;
    }
    
    // Hash the filename to bypass Windows MAX_PATH limit and illegal characters
    let hashed_name = hash_filename(&filename);
    let dest_path = videos_dir.join(&hashed_name);
    
    // 2. Check if file already exists
    if dest_path.exists() {
        return Ok(dest_path.to_string_lossy().into_owned());
    }
    
    // 3. Download using reqwest
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to fetch video: {}", e))?;
        
    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }
    
    let content = response.bytes()
        .await
        .map_err(|e| format!("Failed to read video bytes: {}", e))?;
        
    // 4. Save to destination
    let mut file = File::create(&dest_path)
        .map_err(|e| format!("Failed to create local file: {}", e))?;
        
    file.write_all(&content)
        .map_err(|e| format!("Failed to write to local file: {}", e))?;
        
    Ok(dest_path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub async fn clear_video_cache(app: AppHandle) -> Result<(), String> {
    let cache_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let videos_dir = cache_dir.join("nexus-videos");
    if videos_dir.exists() {
        if let Ok(entries) = fs::read_dir(&videos_dir) {
            for entry in entries.flatten() {
                let _ = fs::remove_file(entry.path());
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn open_file_externally(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        Command::new("cmd")
            .args(["/C", "start", "", &path])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn save_temp_binary(filename: String, bytes: Vec<u8>) -> Result<String, String> {
    let temp_dir = std::env::temp_dir();
    let dest_path = temp_dir.join(&filename);

    fs::write(&dest_path, &bytes)
        .map_err(|e| format!("Failed to write binary to temp: {}", e))?;

    Ok(dest_path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn apply_portable_update(new_exe_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let current_exe = std::env::current_exe()
            .map_err(|e| format!("Failed to get current exe path: {}", e))?;
        let current_exe_str = current_exe.to_string_lossy().to_string();

        let temp_dir = std::env::temp_dir();
        let bat_path = temp_dir.join("update_nexus_portable.bat");

        let bat_content = format!(
            "@echo off\r\ntimeout /t 2 /nobreak > NUL\r\ncopy /y \"{}\" \"{}\"\r\nstart \"\" \"{}\"\r\ndel \"{}\"\r\ndel \"%~f0\"\r\n",
            new_exe_path, current_exe_str, current_exe_str, new_exe_path
        );

        fs::write(&bat_path, bat_content)
            .map_err(|e| format!("Failed to write update bat: {}", e))?;

        Command::new("cmd")
            .args(["/C", &bat_path.to_string_lossy()])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Failed to spawn update batch: {}", e))?;

        std::process::exit(0);
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Portable auto-update is only supported on Windows".into())
    }
}

#[tauri::command]
pub async fn download_update_binary(
    window: tauri::Window,
    url: String,
    filename: String,
) -> Result<String, String> {
    use std::io::Write;
    use futures_util::StreamExt;

    let temp_dir = std::env::temp_dir();
    let dest_path = temp_dir.join(&filename);

    let client = reqwest::Client::builder()
        .user_agent("nexus-desktop-updater")
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to download update binary: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status code: {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);
    let mut file = File::create(&dest_path)
        .map_err(|e| format!("Failed to create local destination file: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| format!("Error downloading chunk: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Error writing byte chunk to disk: {}", e))?;

        downloaded += chunk.len() as u64;

        let percent = if total_size > 0 {
            ((downloaded as f64 / total_size as f64) * 100.0) as u32
        } else {
            50
        };

        let transferred_mb = format!("{:.2}", downloaded as f64 / (1024.0 * 1024.0));
        let total_mb = if total_size > 0 {
            format!("{:.2}", total_size as f64 / (1024.0 * 1024.0))
        } else {
            "?".to_string()
        };

        let _ = window.emit("update-download-progress", serde_json::json!({
            "percent": percent,
            "transferredMb": transferred_mb,
            "totalMb": total_mb
        }));
    }

    Ok(dest_path.to_string_lossy().into_owned())
}
