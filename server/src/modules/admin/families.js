import express from 'express';
import { z } from 'zod';

import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { Family } from '../../models/Family.js';
import { Membership } from '../../models/Membership.js';
import { User } from '../../models/User.js';
import { pageQuery, idParams, escapeRegex, FAMILY_FIELDS, buildFamilyRows, recentActivity } from './lib.js';
import { logAdminAction } from './audit.js';
import { requireSuperAdmin } from '../../services/platformRoles.js';
import { purgeFamily, restoreFamily } from '../family/deleteFamily.js';

const router = express.Router();

const listQuery = z.object({
  q: z.string().trim().max(200).optional(),
  // 'deleted' = only families their owner deleted (waiting to be restored or removed for good).
  status: z.enum(['all', 'active', 'deleted']).default('all'),
  ...pageQuery,
});

router.get('/', validate({ query: listQuery }), async (req, res, next) => {
  try {
    const { q, status, page, limit } = req.query;
    const filter = q ? { name: new RegExp(escapeRegex(q), 'i') } : {};
    if (status === 'active') filter.deletedAt = null;
    if (status === 'deleted') filter.deletedAt = { $ne: null };
    const [total, families] = await Promise.all([
      Family.countDocuments(filter),
      Family.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select(FAMILY_FIELDS)
        .lean(),
    ]);
    res.json({ items: await buildFamilyRows(families), total, page, limit });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validate({ params: idParams }), async (req, res, next) => {
  try {
    const family = await Family.findById(req.params.id).select(FAMILY_FIELDS).lean();
    if (!family) throw new ApiError(404, 'NOT_FOUND', 'Family not found');

    const memberships = await Membership.find({ familyId: family._id })
      .sort({ createdAt: 1 })
      .select('userId name role access status invitedEmail createdAt')
      .lean();
    const userIds = memberships.map((m) => m.userId).filter(Boolean);
    const users = userIds.length ? await User.find({ _id: { $in: userIds } }).select('email').lean() : [];
    const emailById = new Map(users.map((u) => [String(u._id), u.email]));

    const [[row], activity] = await Promise.all([
      buildFamilyRows([family]),
      recentActivity({ familyId: family._id }, 20),
    ]);

    res.json({
      family: row,
      members: memberships.map((m) => ({
        id: String(m._id),
        userId: m.userId ? String(m.userId) : null,
        name: m.name,
        email: (m.userId && emailById.get(String(m.userId))) || m.invitedEmail || null,
        role: m.role,
        access: m.access,
        status: m.status,
        joinedAt: m.createdAt ?? null,
      })),
      recentActivity: activity,
    });
  } catch (err) {
    next(err);
  }
});

/** POST /admin/families/:id/restore — a deleted family comes back for all its members. */
router.post('/:id/restore', validate({ params: idParams }), async (req, res, next) => {
  try {
    const family = await restoreFamily(req.params.id);
    await logAdminAction(req, { action: 'admin.family.restore', targetType: 'family', targetId: family._id, familyId: family._id, targetTitle: family.name });
    const [row] = await buildFamilyRows([family.toObject()]);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/families/:id — super admin only, and only for a family its owner already deleted:
 * erases everything in it for good (files included). Cannot be undone.
 */
router.delete('/:id', validate({ params: idParams }), requireSuperAdmin, async (req, res, next) => {
  try {
    const result = await purgeFamily(req.params.id);
    // familyId null: the family and its own activity no longer exist.
    await logAdminAction(req, { action: 'admin.family.purge', targetType: 'family', targetId: req.params.id, targetTitle: result.name });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
