declare global {
  interface Window {
    electronAPI: import('../main/preload').ElectronAPI & {
      openDevTools?: () => void;
      toggleDevTools?: () => void;
    };
  }
}

export {}; 