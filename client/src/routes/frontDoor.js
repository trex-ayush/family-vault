import { STORAGE_KEYS, storage } from '@/services/storage.js';

/**
 * Is this a visitor at the site's front door — `/` with no saved sign-in on this device? They get
 * the public landing page (pages/landing/Landing.jsx), which needs nothing from the API, so it
 * shows at once and the "waking up" screen stays out of its way. index.html's start-up script
 * makes the same check to show the pre-rendered page before any JavaScript downloads.
 */
export function hasSavedSignIn() {
  return Boolean(storage.getRaw(STORAGE_KEYS.accessToken));
}

export function isFrontDoorVisit(pathname = window.location.pathname) {
  return pathname === '/' && !hasSavedSignIn();
}
