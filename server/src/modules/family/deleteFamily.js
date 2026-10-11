/**
 * Deleting a family (owner), restoring it and removing it for good (app admins).
 *
 * Delete is a soft delete: the family gets `deletedAt`, and every membership moves to status
 * 'family_deleted' (its old status kept in `statusBeforeFamilyDelete`). All of the app reaches a
 * family only through an 'active' membership, so it vanishes for every member at once — nothing
 * else needs to know. Restore reverses exactly that. Only `purgeFamily` erases anything, and only
 * for a family that is already deleted.
 */
import { Family } from '../../models/Family.js';
import { Membership } from '../../models/Membership.js';
import { Document } from '../../models/Document.js';
import { Folder } from '../../models/Folder.js';
import { VaultItem } from '../../models/VaultItem.js';
import { Share } from '../../models/Share.js';
import { Activity } from '../../models/Activity.js';
import { PasswordResetToken } from '../../models/PasswordResetToken.js';
import { getStorage } from '../../storage/index.js';
import { ANY_DELETED_STATE } from '../../models/plugins/softDelete.js';
import { ApiError } from '../../middleware/errorHandler.js';

/** "  The  Singh family " and "the singh family" count as the same name when confirming. */
export const sameFamilyName = (a, b) =>
  String(a ?? '').trim().replace(/\s+/g, ' ').toLowerCase() === String(b ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

export async function softDeleteFamily(familyId, userId) {
  const family = await Family.findById(familyId);
  if (!family || family.deletedAt) throw new ApiError(404, 'NOT_FOUND', 'Family not found');
  family.deletedAt = new Date();
  family.deletedBy = userId;
  await family.save();
  await Membership.updateMany({ familyId, status: { $ne: 'family_deleted' } }, [
    { $set: { statusBeforeFamilyDelete: '$status', status: 'family_deleted' } },
  ]);
  return family;
}

export async function restoreFamily(familyId) {
  const family = await Family.findById(familyId);
  if (!family) throw new ApiError(404, 'NOT_FOUND', 'Family not found');
  if (!family.deletedAt) throw new ApiError(400, 'FAMILY_NOT_DELETED', 'This family is not deleted');
  family.deletedAt = null;
  family.deletedBy = null;
  await family.save();
  await Membership.updateMany({ familyId, status: 'family_deleted' }, [
    { $set: { status: { $ifNull: ['$statusBeforeFamilyDelete', 'active'] }, statusBeforeFamilyDelete: null } },
  ]);
  return family;
}

/**
 * Erases a deleted family for good: every file's bytes in storage, its documents, folders,
 * passwords and notes (including ones in its Bin), share links, memberships, pending invite
 * links and activity, then the family itself. Refuses a family that isn't deleted.
 */
export async function purgeFamily(familyId) {
  const family = await Family.findById(familyId).lean();
  if (!family) throw new ApiError(404, 'NOT_FOUND', 'Family not found');
  if (!family.deletedAt) throw new ApiError(400, 'FAMILY_NOT_DELETED', 'Only a deleted family can be removed for good');

  // Rows in the family's Bin too (the soft-delete hook hides them unless asked for).
  const all = { familyId, ...ANY_DELETED_STATE };
  const docs = await Document.find(all).select('files').lean();
  const storage = await getStorage();
  const keys = docs.flatMap((d) => (d.files || []).flatMap((f) => [f.storageKey, f.thumbKey])).filter(Boolean);
  await Promise.all(keys.map((k) => storage.delete(k).catch(() => {})));

  const memberships = await Membership.find({ familyId }).select('_id').lean();
  await Promise.all([
    Document.deleteMany(all),
    Folder.deleteMany(all),
    VaultItem.deleteMany(all),
    Share.deleteMany({ familyId }),
    Activity.deleteMany({ familyId }),
    PasswordResetToken.deleteMany({ membershipId: { $in: memberships.map((m) => m._id) } }),
  ]);
  await Membership.deleteMany({ familyId });
  await Family.deleteOne({ _id: familyId });
  return { name: family.name, files: keys.length };
}
