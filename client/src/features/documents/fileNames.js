/**
 * A file's names, matching the server (server/src/modules/documents/fileNames.js):
 *  - `fileName` — what the app shows: the member's own name for it, else the uploaded name.
 *  - `downloadName` — the shown name plus the original extension, so it opens on any device.
 *  - `nameWithoutExtension` — the uploaded name minus ".jpg"/".pdf", to start a rename from.
 */
const extOf = (name) => {
  const m = /\.[^./\\]+$/.exec(name || '');
  return m ? m[0] : '';
};

export const fileName = (file) => file?.label || file?.originalName || '';

export function downloadName(file) {
  const original = file?.originalName || '';
  const label = (file?.label || '').trim();
  if (!label) return original;
  const ext = extOf(original);
  if (!ext || label.toLowerCase().endsWith(ext.toLowerCase())) return label;
  return `${label}${ext}`;
}

export function nameWithoutExtension(name) {
  const ext = extOf(name);
  return ext ? name.slice(0, -ext.length) : name || '';
}
