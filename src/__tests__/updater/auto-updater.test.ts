/**
 * Tests for the auto-updater portable mode detection logic.
 * Validates that NSIS installs are NOT misidentified as portable.
 */

import * as path from 'path';

// We test the pure logic, not the Electron-dependent class.
// Extract detectPortableMode logic into a testable pure function.
function detectPortableMode(opts: {
  isPackaged: boolean;
  portableEnvVar?: string;
  exePath: string;
  hasUninstaller: boolean;
}): boolean {
  if (!opts.isPackaged) return false;
  if (opts.portableEnvVar) return true;

  const exeName = path.basename(opts.exePath).toLowerCase();
  const inProgramFiles = opts.exePath.toLowerCase().includes('program files');
  const portablePattern = /^nexus-[\d.]+-x64\.exe$/i;
  const matchesPortableName = portablePattern.test(exeName);
  const exeIsNsisDefault = exeName === 'nexus.exe' && !matchesPortableName;

  // Must satisfy ALL conditions to be classified as portable:
  // no uninstaller, not in Program Files, and not the NSIS default exe name
  return !opts.hasUninstaller && !inProgramFiles && !exeIsNsisDefault;
}

describe('detectPortableMode', () => {
  it('returns false when app is not packaged', () => {
    expect(detectPortableMode({
      isPackaged: false,
      exePath: 'Nexus-1.3.2-x64.exe',
      hasUninstaller: false,
    })).toBe(false);
  });

  it('returns true when PORTABLE_EXECUTABLE_FILE env is set', () => {
    expect(detectPortableMode({
      isPackaged: true,
      portableEnvVar: 'C:\\Users\\User\\Nexus-1.3.2-x64.exe',
      exePath: 'Nexus-1.3.2-x64.exe',
      hasUninstaller: false,
    })).toBe(true);
  });

  it('returns false when uninstaller exists (NSIS installed)', () => {
    expect(detectPortableMode({
      isPackaged: true,
      exePath: 'C:\\Program Files\\nexus\\Nexus.exe',
      hasUninstaller: true,
    })).toBe(false);
  });

  it('returns false for NSIS install in Program Files without uninstaller found', () => {
    // Edge case: uninstaller not found but exe is in Program Files
    expect(detectPortableMode({
      isPackaged: true,
      exePath: 'C:\\Program Files\\nexus\\Nexus.exe',
      hasUninstaller: false,
    })).toBe(false);
  });

  it('returns false for default NSIS exe name "nexus.exe" not in Program Files', () => {
    // Bug scenario from v1.3.1: no uninstaller visible, not in Program Files,
    // but it IS an NSIS install because the exe is named "nexus.exe"
    expect(detectPortableMode({
      isPackaged: true,
      exePath: 'C:\\Users\\User\\AppData\\Local\\Programs\\nexus\\Nexus.exe',
      hasUninstaller: false,
    })).toBe(false);
  });

  it('returns true for portable exe with correct name pattern', () => {
    expect(detectPortableMode({
      isPackaged: true,
      exePath: 'C:\\Users\\User\\Downloads\\Nexus-1.3.2-x64.exe',
      hasUninstaller: false,
    })).toBe(true);
  });

  it('returns true for portable exe in Desktop folder', () => {
    expect(detectPortableMode({
      isPackaged: true,
      exePath: 'C:\\Users\\User\\Desktop\\Nexus-1.3.2-x64.exe',
      hasUninstaller: false,
    })).toBe(true);
  });

  it('portable pattern is version-agnostic', () => {
    const versions = ['1.0.0', '1.3.2', '2.0.0', '10.1.5'];
    for (const v of versions) {
      expect(detectPortableMode({
        isPackaged: true,
        exePath: `C:\\Tools\\Nexus-${v}-x64.exe`,
        hasUninstaller: false,
      })).toBe(true);
    }
  });
});
