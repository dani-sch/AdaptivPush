// Polyfill FormData for Hermes before Expo's winter runtime loads.
// Expo SDK 54's runtime.native calls installFormDataPatch(FormData) at module
// init time before React Native's setUpXHR has registered it as a global.
// This placeholder satisfies the reference; RN will overwrite it with the real
// implementation during its own initialization sequence.
if (typeof global.FormData === 'undefined') {
  // eslint-disable-next-line no-undef
  global.FormData = class FormData {
    _parts = [];
    append(name, value) { this._parts.push([name, value]); }
    get(name) { return this._parts.find(([k]) => k === name)?.[1] ?? null; }
    getAll(name) { return this._parts.filter(([k]) => k === name).map(([, v]) => v); }
    has(name) { return this._parts.some(([k]) => k === name); }
    delete(name) { this._parts = this._parts.filter(([k]) => k !== name); }
    set(name, value) { this.delete(name); this.append(name, value); }
  };
}

require('expo-router/entry');

