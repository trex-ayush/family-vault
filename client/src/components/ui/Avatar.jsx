/**
 * Avatar — a circle with the person's photo, or their first letter.
 *  - Photo: `avatarUrl`, set from a linked Google account's profile picture (docs/API.md).
 *  - Otherwise: the first letter of their name on a colour picked automatically from the name,
 *    so the same person always gets the same colour on every screen. There is no colour choice
 *    (the old `avatarColor` field is ignored).
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

/** The same name always gives the same colour. */
export function letterColor(name) {
  let hash = 0;
  for (const ch of String(name || '').trim().toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return LETTER_COLORS[hash % LETTER_COLORS.length];
}

const Avatar = ({ user, size = 'md', className = '' }) => {
  const sizeCls = SIZES[size] || SIZES.md;
  const name = user?.name || '';
  const initial = name.charAt(0).toUpperCase() || '?';

  const photoUrl = user?.avatarUrl || user?.avatar;
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeCls} rounded-full object-cover ${className}`}
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
