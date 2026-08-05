use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
    pub category: String,
}

#[tauri::command]
pub fn get_logs(limit: Option<usize>) -> Vec<LogEntry> {
    let _limit = limit.unwrap_or(100);
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_logs_empty() {
        let logs = get_logs(Some(10));
        assert!(logs.is_empty());
    }
}
