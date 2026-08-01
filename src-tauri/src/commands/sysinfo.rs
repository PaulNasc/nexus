use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct SystemInfo {
    pub version: String,
    pub os: String,
    pub platform: String,
    pub arch: String,
    pub is_portable: bool,
}

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    SystemInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        is_portable: true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_system_info() {
        let info = get_system_info();
        assert_eq!(info.version, env!("CARGO_PKG_VERSION"));
        assert!(info.is_portable);
    }
}
