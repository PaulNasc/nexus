if (typeof window === 'undefined') {
  (global as unknown as { window: Record<string, unknown> }).window = {};
}

import { desktopAdapter } from '../lib/desktopAdapter';

describe('DesktopAdapter', () => {
  afterEach(() => {
    (desktopAdapter as unknown as { cachedSystemInfo: null }).cachedSystemInfo = null;
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    delete (window as unknown as { __TAURI__?: unknown }).__TAURI__;
  });

  test('should detect Web runtime by default when neither Electron nor Tauri is present', () => {
    expect(desktopAdapter.runtime).toBe('web');
    expect(desktopAdapter.isElectron()).toBe(false);
    expect(desktopAdapter.isTauri()).toBe(false);
  });

  test('should detect Electron runtime when window.electronAPI exists', () => {
    (window as unknown as { electronAPI: unknown }).electronAPI = { systemInfo: {} };

    expect(desktopAdapter.runtime).toBe('electron');
    expect(desktopAdapter.isElectron()).toBe(true);
    expect(desktopAdapter.isTauri()).toBe(false);
  });

  test('should detect Tauri runtime when window.__TAURI_INTERNALS__ exists', () => {
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {};

    expect(desktopAdapter.runtime).toBe('tauri');
    expect(desktopAdapter.isTauri()).toBe(true);
    expect(desktopAdapter.isElectron()).toBe(false);
  });

  test('should return system info fallback for web runtime', async () => {
    const info = await desktopAdapter.getSystemInfo();
    expect(info.version).toBeDefined();
    expect(info.platform).toBe('web');
  });

  test('should delegate getSystemInfo to electronAPI if running under Electron', async () => {
    const mockGetInfo = jest.fn().mockResolvedValue({
      version: '1.3.5',
      os: 'Windows 11',
      platform: 'win32',
      arch: 'x64',
      isPortable: true,
    });

    (window as unknown as { electronAPI: unknown }).electronAPI = {
      systemInfo: { getInfo: mockGetInfo },
    };

    const info = await desktopAdapter.getSystemInfo();
    expect(mockGetInfo).toHaveBeenCalled();
    expect(info.os).toBe('Windows 11');
  });
});
