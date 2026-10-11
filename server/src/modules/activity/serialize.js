import { Membership } from '../../models/Membership.js';
import { User } from '../../models/User.js';

/**
 * Shared Activity -> docs/API.md `Activity` shape mapping. Used by both this module's GET
 * /activity list and the stats module's `recentActivity`. Deliberately drops fields that aren't
 * in the documented shape (familyId, actorMembershipId, ipHash, userAgent) — ipHash/userAgent are
 * only ever surfaced via GET /shares/:id/access-log, which builds its own shape.
 */
export function serializeActivity(a) {
  return {
    id: String(a._id),
    actorName: a.actorName,
    action: a.action,
    targetType: a.targetType,
    targetId: a.targetId,
    documentId: a.documentId,
    folderId: a.folderId,
    shareId: a.shareId,
    meta: a.meta,
    createdAt: a.createdAt,
  };
}

/**
 * The photo (Google profile picture) of whoever did each activity, keyed by activity id — so the
 * feed can show faces instead of only letters. Two batched lookups, no N+1. A sign-in has no
 * member on it (it's logged before a family is chosen), so it uses the signed-in user instead;
 * creating a family has no member yet either, so the row's own `actorUserId` is used.
 */
export async function actorAvatarUrls(rows) {
  const membershipIds = [...new Set(rows.map((r) => r.actorMembershipId).filter(Boolean).map(String))];
  const memberships = membershipIds.length ? await Membership.find({ _id: { $in: membershipIds } }).select('userId').lean() : [];
  const userByMembership = new Map(memberships.map((m) => [String(m._id), m.userId ? String(m.userId) : null]));

  const userIdOf = (r) => {
    if (r.actorMembershipId) return userByMembership.get(String(r.actorMembershipId)) || (r.actorUserId ? String(r.actorUserId) : null);
    if (r.actorUserId) return String(r.actorUserId);
    return r.targetType === 'user' && r.targetId ? String(r.targetId) : null;
  };
  const userIds = [...new Set(rows.map(userIdOf).filter(Boolean))];
  const users = userIds.length ? await User.find({ _id: { $in: userIds } }).select('avatarUrl').lean() : [];
  const avatarByUser = new Map(users.map((u) => [String(u._id), u.avatarUrl || null]));

  return new Map(rows.map((r) => [String(r._id), avatarByUser.get(userIdOf(r)) || null]));
}
