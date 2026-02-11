/**
 * electron-builder configuration (extends package.json "build" field).
 * This JS config is needed because electron-builder v24.x has a bug where
 * `sign: false` in package.json doesn't fully disable code signing on Windows.
 * A custom sign function that returns immediately is the reliable workaround.
 */
module.exports = {
  win: {
    // No-op sign function — completely disables code signing
    sign: async () => {},
    signAndEditExecutable: false,
    verifyUpdateCodeSignature: false,
  },
};
