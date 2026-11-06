import express from 'express';
import { z } from 'zod';
import { describeBrowser, describeDevice } from '../../utils/device.js';

import { requireAuth, requireFamily, requireWrite, scopeToFamily } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { env } from '../../config/env.js';
import { Share } from '../../models/Share.js';
import { activeFiles } from '../../models/Document.js';
import { Family, SHARE_DURATIONS } from '../../models/Family.js';
import { Activity } from '../../models/Activity.js';
import { logActivity } from '../../services/activityLogger.js';
import { generateOpaqueToken, sha256Hex } from '../../utils/crypto.js';
import { openText, sealText } from '../documents/secretText.js';
import {
  computeExpiresAt,
  loadTarget,
  shareStatus,
  targetLabelFrom,
  resolveTargetLabels,
  serializeShare,
} from './lib.js';

const router = express.Router();

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const durationEnum = z.enum(SHARE_DURATIONS);

const createShareSchema = z.object({
  targetType: z.enum(['document', 'folder', 'item']),
  targetId: objectId,
  // Document shares only: expose just these files (e.g. "share this one photo").
  fileIds: z.array(objectId).max(200).optional(),
  // Omitted -> the family's default (Settings > Family).
  duration: durationEnum.optional(),
});

const listQuerySchema = z.object({
  targetId: objectId.optional(),
  status: z.enum(['active', 'expired', 'revoked']).optional(),
});

const patchShareSchema = z
  .object({
    revoke: z.literal(true).optional(),
    // Turn an off or expired link back on: the same link works again, for its own length of time.
    reactivate: z.literal(true).optional(),
    // Restart the clock: the link now expires this long from now.
    extendTo: durationEnum.optional(),
  })
  .refine((b) => b.revoke !== undefined || b.reactivate !== undefined || b.extendTo !== undefined, {
    message: 'Nothing to update',
  })
  .refine((b) => !(b.revoke && b.reactivate), { message: 'Choose either revoke or reactivate' });

// Every /shares route manages sharing for the family, not just views it — "Write" per docs/API.md.
router.use(requireAuth, requireFamily, requireWrite);

router.get('/', validate({ query: listQuerySchema }), async (req, res, next) => {
  try {
    const { targetId, status } = req.query;
    const filter = scopeToFamily(req.auth.familyId, {});
    if (targetId) filter.targetId = targetId;

    const now = new Date();
    if (status === 'active') {
      filter.revokedAt = null;
      filter.expiresAt = { $gt: now };
    } else if (status === 'expired') {
      filter.revokedAt = null;
      filter.expiresAt = { $lte: now };
    } else if (status === 'revoked') {
      filter.revokedAt = { $ne: null };
    }

    const shares = await Share.find(filter).sort({ createdAt: -1 }).lean();
    const { labelFor, inBin, fileNamesFor } = await resolveTargetLabels(req.auth.familyId, shares);
    res.json({ items: shares.map((s) => serializeShare(s, { targetLabel: labelFor(s), targetInBin: inBin(s), fileNames: fileNamesFor(s) })) });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate({ body: createShareSchema }), async (req, res, next) => {
  try {
    const { targetType, targetId, fileIds } = req.body;

    const target = await loadTarget(req.auth.familyId, targetType, targetId);
    if (!target) throw new ApiError(404, 'NOT_FOUND', 'Share target not found');

    let validFileIds;
    if (targetType === 'document' && Array.isArray(fileIds) && fileIds.length) {
      // Files in the Bin can't be shared.
      const existing = new Set(activeFiles(target).map((f) => String(f._id)));
      validFileIds = [...new Set(fileIds)].filter((id) => existing.has(id));
      if (!validFileIds.length) throw new ApiError(404, 'NOT_FOUND', 'File not found in this document');
    }

    let { duration } = req.body;
    if (!duration) {
      const family = await Family.findById(req.auth.familyId).select('settings.defaultShareDuration').lean();
      duration = family?.settings?.defaultShareDuration || '12h';
    }

    const token = generateOpaqueToken(32);
    const share = await Share.create({
      familyId: req.auth.familyId,
      tokenHash: sha256Hex(token),
      tokenSealed: sealText(token),
      targetType,
      targetId,
      fileIds: validFileIds,
      duration,
      expiresAt: computeExpiresAt(duration),
      createdBy: req.auth.membershipId,
    });

    await logActivity(req, {
      action: 'share.create',
      targetType,
      targetId,
      shareId: share._id,
      documentId: targetType === 'document' ? targetId : null,
      folderId: targetType === 'folder' ? targetId : null,
      meta: { duration, fileCount: validFileIds?.length ?? null },
    });

    const url = `${env.CLIENT_URL}/s/${token}`;
    res.status(201).json(serializeShare(share, { url, targetLabel: targetLabelFrom(targetType, target) }));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate({ body: patchShareSchema }), async (req, res, next) => {
  try {
    const share = await Share.findOne(scopeToFamily(req.auth.familyId, { _id: req.params.id }));
    if (!share) throw new ApiError(404, 'NOT_FOUND', 'Share not found');

    const { revoke, reactivate, extendTo } = req.body;
    const target = await loadTarget(req.auth.familyId, share.targetType, share.targetId);

    if (reactivate) {
      if (share.revokedByAdmin) {
        throw new ApiError(403, 'REVOKED_BY_ADMIN', 'The site admin turned this link off, so it cannot be turned back on');
      }
      // In the Bin or deleted for good: there is nothing for the link to show.
      if (!target) throw new ApiError(409, 'TARGET_UNAVAILABLE', 'What this link shares is in the Bin or no longer exists');
      // Already working: nothing to do (a double tap must not restart the clock or log twice).
      if (shareStatus(share) === 'active') {
        return res.json(serializeShare(share, { targetLabel: targetLabelFrom(share.targetType, target) }));
      }
      share.revokedAt = null;
      share.expiresAt = computeExpiresAt(share.duration);
    }

    if (revoke && !share.revokedAt) share.revokedAt = new Date();

    if (extendTo) {
      share.duration = extendTo;
      share.expiresAt = computeExpiresAt(extendTo);
    }

    await share.save();

    await logActivity(req, {
      action: revoke ? 'share.revoke' : reactivate ? 'share.reactivate' : 'share.update',
      targetType: share.targetType,
      targetId: share.targetId,
      shareId: share._id,
      meta: { revoke: !!revoke, extendTo: extendTo || null, ...(reactivate ? { duration: share.duration } : {}) },
    });

    res.json(serializeShare(share, { targetLabel: targetLabelFrom(share.targetType, target) }));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const share = await Share.findOne(scopeToFamily(req.auth.familyId, { _id: req.params.id }));
    if (!share) throw new ApiError(404, 'NOT_FOUND', 'Share not found');

    // "Owner/admin only" per docs/API.md — owner here means the membership that created the share.
    if (req.auth.role !== 'admin' && String(share.createdBy) !== req.auth.membershipId) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the share creator or an admin can delete this share');
    }

    await share.deleteOne();

    await logActivity(req, {
      action: 'share.delete',
      targetType: share.targetType,
      targetId: share.targetId,
      shareId: share._id,
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// The same link again, to send it to someone else from the Shares page.
router.get('/:id/link', async (req, res, next) => {
  try {
    const share = await Share.findOne(scopeToFamily(req.auth.familyId, { _id: req.params.id })).lean();
    if (!share) throw new ApiError(404, 'NOT_FOUND', 'Share not found');
    const token = openText(share.tokenSealed);
    if (!token) throw new ApiError(404, 'LINK_NOT_SAVED', 'This older link cannot be shown again. Please make a new one.');
    res.json({ url: `${env.CLIENT_URL}/s/${token}` });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/access-log', async (req, res, next) => {
  try {
    const share = await Share.findOne(scopeToFamily(req.auth.familyId, { _id: req.params.id })).lean();
    if (!share) throw new ApiError(404, 'NOT_FOUND', 'Share not found');

    const logs = await Activity.find(
      scopeToFamily(req.auth.familyId, {
        shareId: share._id,
        action: { $in: ['share.open', 'share.download'] },
      }),
    )
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({
      items: logs.map((l) => {
        return {
          time: l.createdAt,
          ipHash: l.ipHash,
          device: describeDevice(l.userAgent),
          browser: describeBrowser(l.userAgent),
          action: l.action,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
