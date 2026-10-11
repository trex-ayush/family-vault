import { useState } from 'react';

/**
 * Avatar — a circle with the person's photo, a cartoon face, or their first letter.
 *  - Photo: `avatarUrl`, set from a linked Google account's profile picture (docs/API.md).
 *  - Otherwise: a cartoon face from DiceBear (free, no key), picked from the name so the same
 *    person always gets the same face on every screen. Only a scrambled code of the name is
 *    sent, never the name itself.
 *  - If that picture can't load (offline, service down): the first letter of the name on a
 *    colour picked from the name. There is no colour choice (the old `avatarColor` is ignored).
 *
 * Ported from apps/template/src/components/ui/Avatar.jsx.
 *
 * Props:
 *  - user       { name, avatarUrl?, avatar? }
 *  - size?      'xs' | 'sm' | 'md' (default) | 'lg' | 'xl'
 *  - className? appended last (Rule 8)
 *
 * `avatar` is kept as a fallback in case any caller's data uses that name instead of `avatarUrl`.
 *
 * @example
 * <Avatar user={membership} size="md" />
 */
const SIZES = {
  xs: 'w-5 h-5 text-[8px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-9 h-9 text-sm',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-24 h-24 text-3xl',
};

// Dark enough for white letters to read on each.
const LETTER_COLORS = ['#E04F54', '#D97706', '#0F9488', '#0284C7', '#4361EE', '#7209B7', '#C2185B', '#2F855A', '#64748B'];

const nameKey = (name) => String(name || '').trim().toLowerCase();

/** The same name always gives the same colour. */
export function letterColor(name) {
  let hash = 0;
  for (const ch of nameKey(name)) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return LETTER_COLORS[hash % LETTER_COLORS.length];
}

// Several looks, so different people get different kinds of avatar (all with no beard/make-up,
// so none looks wrong for a mum, dad or child).
const CARTOON_STYLES = ['adventurer-neutral', 'fun-emoji', 'bottts-neutral', 'thumbs', 'big-ears-neutral', 'lorelei-neutral'];

/**
 * A cartoon face for this name: the same person always gets the same one, different people get
 * different looks. The name itself never leaves the app (only an FNV-1a code of it is sent).
 */
export function cartoonUrl(name) {
  let hash = 0x811c9dc5;
  for (const ch of nameKey(name)) hash = Math.imul(hash ^ ch.codePointAt(0), 0x01000193) >>> 0;
  const style = CARTOON_STYLES[(hash >>> 16) % CARTOON_STYLES.length];
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${hash.toString(16)}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

const Avatar = ({ user, size = 'md', className = '' }) => {
  const sizeCls = SIZES[size] || SIZES.md;
  const name = user?.name || '';
  const initial = name.charAt(0).toUpperCase() || '?';
  const [failed, setFailed] = useState(null);

  const photoUrl = user?.avatarUrl || user?.avatar || (name ? cartoonUrl(name) : null);
  if (photoUrl && failed !== photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setFailed(photoUrl)}
        className={`${sizeCls} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ backgroundColor: letterColor(name) }}
      className={`${sizeCls} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
};

export default Avatar;
