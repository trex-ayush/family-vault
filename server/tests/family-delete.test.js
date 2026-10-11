import './helpers/setupPlatformOwnerEnv.js';
import './helpers/setupEnv.js';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { startTestDb, stopTestDb, clearDb } from './helpers/db.js';
import { buildApp, signupFamily, authed } from './helpers/factory.js';
import { env } from '../src/config/env.js';
import { Family } from '../src/models/Family.js';
import { Membership } from '../src/models/Membership.js';
import { Folder } from '../src/models/Folder.js';
import { Share } from '../src/models/Share.js';

let app;

beforeAll(async () => {
  await startTestDb();
}, 60000);

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  app = buildApp();
  await clearDb();
});

const bearer = (s) => ({ Authorization: `Bearer ${s.accessToken}` });

/** Owner A's family with B invited into it; B signs in (which joins the invite). */
async function familyWithTwo() {
  const owner = await signupFamily(app);
  const other = await signupFamily(app);
  await authed(request(app).post('/api/members'), owner).send({ name: 'Bee', email: other.user.email }).expect(201);
  const login = await request(app).post('/api/auth/login').send({ email: other.payload.email, password: other.payload.password }).expect(200);
  expect(login.body.memberships.map((m) => m.familyId)).toContain(owner.familyId);
  const member = { ...other, accessToken: login.body.accessToken, familyId: owner.familyId };
  return { owner, member };
}

async function shareLink(owner) {
  const tree = await authed(request(app).get('/api/folders/tree'), owner).expect(200);
  const res = await authed(request(app).post('/api/shares'), owner).send({ targetType: 'folder', targetId: tree.body.items[0].id }).expect(201);
  return res.body.url.split('/s/')[1];
}

describe('deleting a family', () => {
  it('only the owner can delete, and only by typing the family name', async () => {
    const { owner, member } = await familyWithTwo();
    await authed(request(app).delete('/api/family'), member).send({ confirmName: owner.family.name }).expect(403);
    const wrong = await authed(request(app).delete('/api/family'), owner).send({ confirmName: 'nope' }).expect(400);
    expect(wrong.body.code).toBe('NAME_MISMATCH');
    // Case and extra spaces don't matter.
    await authed(request(app).delete('/api/family'), owner).send({ confirmName: `  ${owner.family.name.toUpperCase()} ` }).expect(204);
  });

  it('hides the family from every member at once, and its share links stop working', async () => {
    const { owner, member } = await familyWithTwo();
    const token = await shareLink(owner);
    await request(app).get(`/api/public/shares/${token}`).expect(200);

    await authed(request(app).delete('/api/family'), owner).send({ confirmName: owner.family.name }).expect(204);

    // Gone from both people's family lists, and family requests are refused.
    const me = await request(app).get('/api/auth/me').set(bearer(owner)).expect(200);
    expect(me.body.memberships.map((m) => m.familyId)).not.toContain(owner.familyId);
    const meB = await request(app).get('/api/auth/me').set(bearer(member)).expect(200);
    expect(meB.body.memberships.map((m) => m.familyId)).not.toContain(owner.familyId);
    await authed(request(app).get('/api/folders/tree'), owner).expect(403);
    await authed(request(app).get('/api/folders/tree'), member).expect(403);
    await request(app).get(`/api/public/shares/${token}`).expect(404);

    // Nothing is erased yet.
    expect(await Folder.countDocuments({ familyId: owner.familyId })).toBeGreaterThan(0);
    expect((await Family.findById(owner.familyId)).deletedAt).toBeTruthy();
  });

  it('an app admin can restore it: everyone is back as before', async () => {
    const sup = await signupFamily(app, { email: env.EFFECTIVE_SUPER_ADMIN_EMAIL });
    const { owner, member } = await familyWithTwo();
    await Membership.updateOne({ familyId: owner.familyId, userId: member.user.id }, { access: 'read' });
    await authed(request(app).delete('/api/family'), owner).send({ confirmName: owner.family.name }).expect(204);

    const deleted = await request(app).get('/api/admin/families?status=deleted').set(bearer(sup)).expect(200);
    expect(deleted.body.items.map((f) => f.id)).toEqual([owner.familyId]);
    expect(deleted.body.items[0].deletedAt).toBeTruthy();

    const restored = await request(app).post(`/api/admin/families/${owner.familyId}/restore`).set(bearer(sup)).expect(200);
    expect(restored.body.deletedAt).toBeNull();
    await authed(request(app).get('/api/folders/tree'), owner).expect(200);
    const mB = await Membership.findOne({ familyId: owner.familyId, userId: member.user.id }).lean();
    expect(mB).toMatchObject({ status: 'active', access: 'read', statusBeforeFamilyDelete: null });
  });

  it('only the super admin can remove a deleted family for good, and only once deleted', async () => {
    const sup = await signupFamily(app, { email: env.EFFECTIVE_SUPER_ADMIN_EMAIL });
    const { owner } = await familyWithTwo();
    await shareLink(owner);

    await request(app).delete(`/api/admin/families/${owner.familyId}`).set(bearer(sup)).expect(400); // not deleted yet
    await authed(request(app).delete('/api/family'), owner).send({ confirmName: owner.family.name }).expect(204);

    const plainAdmin = await signupFamily(app);
    await request(app).post('/api/admin/admins').set(bearer(sup)).send({ email: plainAdmin.user.email }).expect(201);
    await request(app).delete(`/api/admin/families/${owner.familyId}`).set(bearer(plainAdmin)).expect(403);

    await request(app).delete(`/api/admin/families/${owner.familyId}`).set(bearer(sup)).expect(204);
    expect(await Family.exists({ _id: owner.familyId })).toBeNull();
    expect(await Membership.countDocuments({ familyId: owner.familyId })).toBe(0);
    expect(await Folder.countDocuments({ familyId: owner.familyId })).toBe(0);
    expect(await Share.countDocuments({ familyId: owner.familyId })).toBe(0);
  });
});

describe('leaving a family', () => {
  it('a member can leave and stays signed in; the owner cannot', async () => {
    const { owner, member } = await familyWithTwo();
    const no = await authed(request(app).post('/api/family/leave'), owner).expect(400);
    expect(no.body.code).toBe('OWNER_CANNOT_LEAVE');

    await authed(request(app).post('/api/family/leave'), member).expect(204);
    await authed(request(app).get('/api/folders/tree'), member).expect(403);
    // Still signed in, with their own family.
    const me = await request(app).get('/api/auth/me').set(bearer(member)).expect(200);
    expect(me.body.memberships.map((m) => m.familyId)).toEqual([member.memberships[0].familyId]);
  });
});
