/**
 * The name a file is shown and downloaded under: the member's own name for it (`label`, set when
 * uploading or by renaming), else the name it was uploaded with. A download keeps the original
 * extension ("Papa's Aadhaar" + ".jpg"), so the file still opens on any device.
 */
import path from 'node:path';

export const FILE_LABEL_MAX = 200;

export function downloadNameOf(file) {
  const original = file?.originalName || '';
  const label = (file?.label || '').trim();
  if (!label) return original;
  const ext = path.extname(original);
  if (!ext || label.toLowerCase().endsWith(ext.toLowerCase())) return label;
  return `${label}${ext}`;
}
