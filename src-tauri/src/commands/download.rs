use std::fs::{self, File};
use std::io::Write;
use tauri::AppHandle;
use tauri::Manager;

#[tauri::command]
pub async fn download_video_to_cache(app: AppHandle, url: String, filename: String) -> Result<String, String> {
    // 1. Get app cache directory
    let cache_dir = app.path().app_cache_dir()
        .map_err(|e| format!("Failed to get cache dir: {}", e))?;
    
    // Create folder "nexus-videos" inside cache directory
    let videos_dir = cache_dir.join("nexus-videos");
    if !videos_dir.exists() {
        fs::create_dir_all(&videos_dir)
            .map_err(|e| format!("Failed to create videos dir: {}", e))?;
    }
    
    let dest_path = videos_dir.join(&filename);
    
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
