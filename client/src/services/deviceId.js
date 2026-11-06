import { STORAGE_KEYS, storage } from './storage.js';

/**
 * A random id saved in this browser and sent when signing in, so the server can tell "the same
 * phone on another network" from "a new device" for the new-device email. It says nothing about
 * the person or the device, stays after logging out, and the server only keeps a hash of it.
 */
export function deviceIdHeaders() {
  let id = storage.getRaw(STORAGE_KEYS.deviceId);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    storage.setRaw(STORAGE_KEYS.deviceId, id);
  }
  return { 'X-Device-Id': id };
}
