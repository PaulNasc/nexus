use std::fs::{self, File};
use std::io::Write;
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;
use tauri::AppHandle;
use tauri::Manager;

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
