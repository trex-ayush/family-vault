import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

// All app-side modules (anything that transitively imports src/config/env.js) are loaded via
// dynamic import AFTER we've set every required env var below — env.js validates process.env at
// module-evaluation time, so it must never be imported before that. This keeps this suite fully
// self-contained (no dependency on a local .env file), which is what makes it CI-portable.
let mongod;
let app;
let mongoose;
let Family;
let User;
let Membership;
let Folder;
let Document;
let Share;
let signAccessToken;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();

  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongod.getUri();
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-aaaaaaaaaaaaaaaaaaaa';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-aaaaaaaaaaaaaaaaaaaa';
  process.env.FILE_TOKEN_SECRET = 'test-file-token-secret-aaaaaaaaaaaaaaaaaaaa';
  process.env.FILE_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
  process.env.STORAGE_DRIVER = 'gridfs';

  mongoose = (await import('mongoose')).default;
  const { connectDB } = await import('../src/db/connect.js');
  await connectDB();

  const { createApp } = await import('../src/app.js');
  app = createApp();

  ({ Family } = await import('../src/models/Family.js'));
  ({ User } = await import('../src/models/User.js'));
  ({ Membership } = await import('../src/models/Membership.js'));
  ({ Folder } = await import('../src/models/Folder.js'));
  ({ Document } = await import('../src/models/Document.js'));
  ({ Share } = await import('../src/models/Share.js'));
  ({ signAccessToken } = await import('../src/utils/tokens.js'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

let uniqueCounter = 0;
function uniq(prefix) {
  uniqueCounter += 1;
  return `${prefix}-${Date.now()}-${uniqueCounter}`;
}

async function createFamilyWithMember(role = 'admin', access = 'write') {
  const user = await User.create({ name: 'Test User', email: `${uniq('user')}@test.com`, passwordHash: 'x' });
  const family = await Family.create({ name: 'Test Family', slug: uniq('family'), createdBy: user._id });
  const membership = await Membership.create({
    familyId: family._id,
    userId: user._id,
    name: user.name,
    role,
    access,
    isOwner: role === 'admin',
    canLogin: true,
  });
  // Multi-family sessions (docs/API.md): the access token only proves WHO is calling — `which
  // family` now comes from the X-Family-Id header, resolved server-side against this Membership.
  const accessToken = signAccessToken({ userId: user._id });
  return { user, family, membership, accessToken };
}

async function createFolder(family, membership, overrides = {}) {
  return Folder.create({
    familyId: family._id,
    name: overrides.name || 'Folder A',
    parentId: overrides.parentId ?? null,
    createdBy: membership._id,
  });
}

async function createDocument(family, membership, folder, overrides = {}) {
  return Document.create({
    familyId: family._id,
    folderId: folder._id,
    title: overrides.title || 'Passport',
    createdBy: membership._id,
    files: overrides.files || [],
  });
}

const HOUR = 60 * 60 * 1000;

function fakeFile(membership, name = 'front.jpg') {
  return {
    storageKey: uniq('files/fake'),
    originalName: name,
    mimeType: 'image/jpeg',
    size: 10,
    encryption: { iv: 'a', tag: 'b', wrappedKey: 'c', keyIv: 'd', keyTag: 'e' },
    uploadedBy: membership._id,
  };
}

function post(accessToken, family) {
  return request(app).post('/api/shares').set('Authorization', `Bearer ${accessToken}`).set('X-Family-Id', family.id);
}

function expectExpiresIn(body, ms) {
  const at = new Date(body.expiresAt).getTime();
  expect(at).toBeGreaterThan(Date.now() + ms - 60_000);
  expect(at).toBeLessThanOrEqual(Date.now() + ms + 1000);
}

describe('shares module', () => {
  describe('POST /api/shares', () => {
    it("uses the family's default duration (12h out of the box) when none is given", async () => {
      const { family, membership, accessToken } = await createFamilyWithMember();
      const folder = await createFolder(family, membership);
      const doc = await createDocument(family, membership, folder);

      const res = await post(accessToken, family).send({ targetType: 'document', targetId: doc.id });
      expect(res.status).toBe(201);
      expect(res.body.duration).toBe('12h');
      expectExpiresIn(res.body, 12 * HOUR);
      expect(res.body.status).toBe('active');
      expect(res.body.url).toMatch(/^http:\/\/localhost:5173\/s\//);
      expect(res.body).not.toHaveProperty('hasPassword');
      expect(res.body).not.toHaveProperty('includeSensitive');
      expect(res.body).not.toHaveProperty('allowDownload');
      expect(res.body).not.toHaveProperty('label');
    });

    it('follows a changed family default, and a per-link choice overrides it', async () => {
      const { family, membership, accessToken } = await createFamilyWithMember();
      await Family.updateOne({ _id: family._id }, { 'settings.defaultShareDuration': '7d' });
      const folder = await createFolder(family, membership);

      const byDefault = await post(accessToken, family).send({ targetType: 'folder', targetId: folder.id });
      expect(byDefault.status).toBe(201);
      expect(byDefault.body.duration).toBe('7d');
      expectExpiresIn(byDefault.body, 7 * 24 * HOUR);

      const picked = await post(accessToken, family).send({ targetType: 'folder', targetId: folder.id, duration: '24h' });
      expect(picked.status).toBe(201);
      expect(picked.body.duration).toBe('24h');
      expectExpiresIn(picked.body, 24 * HOUR);
    });

    it.each([['30d'], ['1h'], ['never']])('rejects the unsupported duration %s', async (duration) => {
      const { family, membership, accessToken } = await createFamilyWithMember();
      const folder = await createFolder(family, membership);
      const res = await post(accessToken, family).send({ targetType: 'folder', targetId: folder.id, duration });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    describe('a saved password', () => {
      async function addItem(s, folder, body) {
        const res = await request(app)
          .post('/api/items')
          .set('Authorization', `Bearer ${s.accessToken}`).set('X-Family-Id', s.family.id)
          .send({ folderId: folder.id, ...body });
        expect(res.status).toBe(201);
        return res.body.item || res.body;
      }
      const LOGIN = { kind: 'login', title: 'Net banking', username: 'ravi.k', password: 'S3cret-Pass!', notes: 'branch note', fields: [{ key: 'ATM PIN', value: '9911' }] };

      it('shows only its title, username and password, and is never cached', async () => {
        const s = await createFamilyWithMember();
        const folder = await createFolder(s.family, s.membership);
        const item = await addItem(s, folder, LOGIN);

        const created = await post(s.accessToken, s.family).send({ targetType: 'item', targetId: item.id, duration: '12h' });
        expect(created.status).toBe(201);
        expect(created.body.targetLabel).toBe('Net banking');

        const token = created.body.url.split('/s/')[1];
        const opened = await request(app).get(`/api/public/shares/${token}`).expect(200);
        expect(opened.body.password).toEqual({ title: 'Net banking', username: 'ravi.k', password: 'S3cret-Pass!' });
        expect(opened.headers['cache-control']).toBe('no-store');
        expect(JSON.stringify(opened.body)).not.toContain('branch note');
        expect(JSON.stringify(opened.body)).not.toContain('9911');

        await request(app).post(`/api/public/shares/${token}/zip-link`).expect(404);

        // Listed by name; the password itself is never in the list.
        const list = await request(app)
          .get('/api/shares')
          .set('Authorization', `Bearer ${s.accessToken}`).set('X-Family-Id', s.family.id);
        expect(list.body.items[0].targetLabel).toBe('Net banking');
        expect(JSON.stringify(list.body)).not.toContain('S3cret-Pass!');

        // In the Bin: the link shows nothing.
        const { VaultItem } = await import('../src/models/VaultItem.js');
        await VaultItem.updateOne({ _id: item.id }, { deletedAt: new Date() });
        await request(app).get(`/api/public/shares/${token}`).expect(404);
      });

      it('a note cannot be shared, nor a password from another family', async () => {
        const s = await createFamilyWithMember();
        const folder = await createFolder(s.family, s.membership);
        const note = await addItem(s, folder, { kind: 'note', title: 'Locker', notes: 'row 4' });
        const res = await post(s.accessToken, s.family).send({ targetType: 'item', targetId: note.id });
        expect(res.status).toBe(404);

        const login = await addItem(s, folder, LOGIN);
        const other = await createFamilyWithMember();
        const foreign = await post(other.accessToken, other.family).send({ targetType: 'item', targetId: login.id });
        expect(foreign.status).toBe(404);
      });

      it('a folder link still leaves passwords out', async () => {
        const s = await createFamilyWithMember();
        const folder = await createFolder(s.family, s.membership);
        await addItem(s, folder, LOGIN);
        const created = await post(s.accessToken, s.family).send({ targetType: 'folder', targetId: folder.id });
        const opened = await request(app).get(`/api/public/shares/${created.body.url.split('/s/')[1]}`).expect(200);
        expect(JSON.stringify(opened.body)).not.toContain('S3cret-Pass!');
        expect(JSON.stringify(opened.body)).not.toContain('ravi.k');
      });
    });

    it('shares just one file of a document', async () => {
      const { family, membership, accessToken } = await createFamilyWithMember();
      const folder = await createFolder(family, membership);
      const doc = await createDocument(family, membership, folder, {
        files: [fakeFile(membership, 'front.jpg'), fakeFile(membership, 'back.jpg')],
      });
      const backId = String(doc.files[1]._id);

      const res = await post(accessToken, family).send({ targetType: 'document', targetId: doc.id, fileIds: [backId] });
      expect(res.status).toBe(201);
      expect(res.body.fileIds).toEqual([backId]);

      const stored = await Share.findById(res.body.id);
      expect(stored.fileIds.map(String)).toEqual([backId]);
    });

    it('404s a file id that is not part of the document', async () => {
      const { family, membership, accessToken } = await createFamilyWithMember();
      const folder = await createFolder(family, membership);
      const doc = await createDocument(family, membership, folder, { files: [fakeFile(membership)] });

      const res = await post(accessToken, family).send({
        targetType: 'document',
        targetId: doc.id,
        fileIds: [new mongoose.Types.ObjectId().toString()],
      });
      expect(res.status).toBe(404);
    });

    it('404s when the target document does not exist in the caller family', async () => {
      const { family, accessToken } = await createFamilyWithMember();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await post(accessToken, family).send({ targetType: 'document', targetId: fakeId });
      expect(res.status).toBe(404);
    });

    it('returns the raw token URL only on create; list omits it', async () => {
      const { family, membership, accessToken } = await createFamilyWithMember();
      const folder = await createFolder(family, membership);
      const doc = await createDocument(family, membership, folder);

      const created = await post(accessToken, family).send({ targetType: 'document', targetId: doc.id, duration: '24h' });
      expect(created.status).toBe(201);
      expect(created.body.url).toBeTruthy();

      const listed = await request(app).get('/api/shares').set('Authorization', `Bearer ${accessToken}`).set('X-Family-Id', family.id);
      expect(listed.status).toBe(200);
      expect(listed.body.items).toHaveLength(1);
      expect(listed.body.items[0].url).toBeUndefined();
      expect(listed.body.items[0].targetLabel).toBe('Passport');
      expect(listed.body.items[0].targetInBin).toBe(false);
      expect(listed.body.items[0].openCount).toBe(0);
    });

    it('still names a shared document that is in the Bin, and flags it', async () => {
      const { family, membership, accessToken } = await createFamilyWithMember();
      const folder = await createFolder(family, membership);
      const doc = await createDocument(family, membership, folder, { title: 'Old bill' });
      await post(accessToken, family).send({ targetType: 'document', targetId: doc.id });
      await Document.updateOne({ _id: doc._id }, { $set: { deletedAt: new Date() } });

      const listed = await request(app).get('/api/shares').set('Authorization', `Bearer ${accessToken}`).set('X-Family-Id', family.id);
      expect(listed.status).toBe(200);
      expect(listed.body.items[0].targetLabel).toBe('Old bill');
      expect(listed.body.items[0].targetInBin).toBe(true);
    });
  });

  describe('access control', () => {
    it('401s with no bearer token', async () => {
      const res = await request(app).get('/api/shares');
      expect(res.status).toBe(401);
    });

    it('403s a read-only member trying to create a share', async () => {
      const { family, membership, accessToken } = await createFamilyWithMember('member', 'read');
      const folder = await createFolder(family, membership);
      const doc = await createDocument(family, membership, folder);

      const res = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`).set('X-Family-Id', family.id)
        .send({ targetType: 'document', targetId: doc.id, duration: '24h' });

      expect(res.status).toBe(403);
    });

    it('only the creator or an admin can DELETE a share', async () => {
      const { family, membership: adminMembership, accessToken: adminToken } = await createFamilyWithMember(
        'admin',
        'write',
      );
      const folder = await createFolder(family, adminMembership);
      const doc = await createDocument(family, adminMembership, folder);

      const created = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Family-Id', family.id)
        .send({ targetType: 'document', targetId: doc.id, duration: '24h' });
      const shareId = created.body.id;

      // A second write-access, non-admin, non-creator member of the SAME family.
      const otherUser = await User.create({ name: 'Other', email: `${uniq('user')}@test.com`, passwordHash: 'x' });
      await Membership.create({
        familyId: family._id,
        userId: otherUser._id,
        name: 'Other',
        role: 'member',
        access: 'write',
        canLogin: true,
      });
      const otherToken = signAccessToken({ userId: otherUser._id });

      const forbidden = await request(app)
        .delete(`/api/shares/${shareId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .set('X-Family-Id', family.id);
      expect(forbidden.status).toBe(403);

      const allowed = await request(app)
        .delete(`/api/shares/${shareId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Family-Id', family.id);
      expect(allowed.status).toBe(204);
    });
  });

  describe('PATCH /api/shares/:id', () => {
    it('revokes a share and it drops out of status=active', async () => {
      const { family, membership, accessToken } = await createFamilyWithMember();
      const folder = await createFolder(family, membership);
      const doc = await createDocument(family, membership, folder);

      const created = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`).set('X-Family-Id', family.id)
        .send({ targetType: 'document', targetId: doc.id, duration: '24h' });
      const shareId = created.body.id;

      const patched = await request(app)
        .patch(`/api/shares/${shareId}`)
        .set('Authorization', `Bearer ${accessToken}`).set('X-Family-Id', family.id)
        .send({ revoke: true });
      expect(patched.status).toBe(200);
      expect(patched.body.revokedAt).toBeTruthy();
      expect(patched.body.status).toBe('revoked');

      const activeList = await request(app)
        .get('/api/shares?status=active')
        .set('Authorization', `Bearer ${accessToken}`).set('X-Family-Id', family.id);
      expect(activeList.body.items).toHaveLength(0);

      const revokedList = await request(app)
        .get('/api/shares?status=revoked')
        .set('Authorization', `Bearer ${accessToken}`).set('X-Family-Id', family.id);
      expect(revokedList.body.items).toHaveLength(1);
    });

    it('turns an off link back on: the same link works again, for its own length of time', async () => {
      const { family, membership, accessToken } = await createFamilyWithMember();
      const folder = await createFolder(family, membership);
      const doc = await createDocument(family, membership, folder);
      const patch = (id, body) => request(app)
        .patch(`/api/shares/${id}`)
        .set('Authorization', `Bearer ${accessToken}`).set('X-Family-Id', family.id)
        .send(body);

      const created = await post(accessToken, family).send({ targetType: 'document', targetId: doc.id, duration: '24h' });
      const token = created.body.url.split('/s/')[1];
      await patch(created.body.id, { revoke: true }).expect(200);
      await request(app).get(`/api/public/shares/${token}`).expect(410);

      const on = await patch(created.body.id, { reactivate: true }).expect(200);
      expect(on.body.status).toBe('active');
      expect(on.body.revokedAt).toBeNull();
      expectExpiresIn(on.body, 24 * HOUR);
      await request(app).get(`/api/public/shares/${token}`).expect(200);

      // An expired link can come back too.
      await Share.updateOne({ _id: created.body.id }, { expiresAt: new Date(Date.now() - HOUR) });
      await request(app).get(`/api/public/shares/${token}`).expect(410);
      const again = await patch(created.body.id, { reactivate: true }).expect(200);
      expectExpiresIn(again.body, 24 * HOUR);

      // Turning on a link that already works changes nothing.
      await Share.updateOne({ _id: created.body.id }, { expiresAt: new Date(Date.now() + HOUR) });
      const same = await patch(created.body.id, { reactivate: true }).expect(200);
      expectExpiresIn(same.body, HOUR);

      await patch(created.body.id, { revoke: true, reactivate: true }).expect(400);
    });

    it('will not turn a link back on when an admin turned it off or its document is in the Bin', async () => {
      const { family, membership, accessToken } = await createFamilyWithMember();
      const folder = await createFolder(family, membership);
      const doc = await createDocument(family, membership, folder);
      const patch = (id, body) => request(app)
        .patch(`/api/shares/${id}`)
        .set('Authorization', `Bearer ${accessToken}`).set('X-Family-Id', family.id)
        .send(body);

      const byAdmin = await post(accessToken, family).send({ targetType: 'document', targetId: doc.id });
      await Share.updateOne({ _id: byAdmin.body.id }, { revokedAt: new Date(), revokedByAdmin: true });
      const refused = await patch(byAdmin.body.id, { reactivate: true }).expect(403);
      expect(refused.body.code).toBe('REVOKED_BY_ADMIN');

      const inBin = await post(accessToken, family).send({ targetType: 'document', targetId: doc.id });
      await patch(inBin.body.id, { revoke: true }).expect(200);
      await Document.updateOne({ _id: doc.id }, { deletedAt: new Date() });
      const gone = await patch(inBin.body.id, { reactivate: true }).expect(409);
      expect(gone.body.code).toBe('TARGET_UNAVAILABLE');
    });

    it('names the shared file in the list, so links to one document can be told apart', async () => {
      const { family, membership, accessToken } = await createFamilyWithMember();
      const folder = await createFolder(family, membership);
      const doc = await createDocument(family, membership, folder, {
        files: [fakeFile(membership, 'front.jpg'), { ...fakeFile(membership, 'back.jpg'), label: 'Back side' }],
      });
      const [front, back] = doc.files;
      await post(accessToken, family).send({ targetType: 'document', targetId: doc.id, fileIds: [String(front._id)] });
      await post(accessToken, family).send({ targetType: 'document', targetId: doc.id, fileIds: [String(back._id)] });
      await post(accessToken, family).send({ targetType: 'document', targetId: doc.id });

      const list = await request(app)
        .get('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`).set('X-Family-Id', family.id);
      expect(list.body.items.map((s) => s.fileNames).sort((a, b) => a.length - b.length || String(a).localeCompare(String(b))))
        .toEqual([[], ['Back side'], ['front.jpg']]);
    });

    it('shows the same link again, only to its family, and says when an older link cannot', async () => {
      const a = await createFamilyWithMember();
      const folder = await createFolder(a.family, a.membership);
      const doc = await createDocument(a.family, a.membership, folder);
      const link = (id, who) => request(app)
        .get(`/api/shares/${id}/link`)
        .set('Authorization', `Bearer ${who.accessToken}`).set('X-Family-Id', who.family.id);

      const created = await post(a.accessToken, a.family).send({ targetType: 'document', targetId: doc.id });
      expect(created.body.canShowLink).toBe(true);
      expect(created.body).not.toHaveProperty('tokenSealed');
      const again = await link(created.body.id, a).expect(200);
      expect(again.body.url).toBe(created.body.url);

      const stored = await Share.findById(created.body.id).lean();
      expect(stored.tokenSealed).not.toContain(created.body.url.split('/s/')[1]);

      const b = await createFamilyWithMember();
      await link(created.body.id, b).expect(404);

      await Share.updateOne({ _id: created.body.id }, { $unset: { tokenSealed: 1 } });
      const older = await link(created.body.id, a).expect(404);
      expect(older.body.code).toBe('LINK_NOT_SAVED');
      const list = await request(app)
        .get('/api/shares')
        .set('Authorization', `Bearer ${a.accessToken}`).set('X-Family-Id', a.family.id);
      expect(list.body.items[0].canShowLink).toBe(false);
      expect(list.body.items[0]).not.toHaveProperty('tokenSealed');
    });

    it('extends a link by restarting the clock with a new duration', async () => {
      const { family, membership, accessToken } = await createFamilyWithMember();
      const folder = await createFolder(family, membership);
      const doc = await createDocument(family, membership, folder);

      const created = await post(accessToken, family).send({ targetType: 'document', targetId: doc.id, duration: '12h' });
      const shareId = created.body.id;

      const extended = await request(app)
        .patch(`/api/shares/${shareId}`)
        .set('Authorization', `Bearer ${accessToken}`).set('X-Family-Id', family.id)
        .send({ extendTo: '7d' });
      expect(extended.status).toBe(200);
      expect(extended.body.duration).toBe('7d');
      expectExpiresIn(extended.body, 7 * 24 * HOUR);

      const isoDate = await request(app)
        .patch(`/api/shares/${shareId}`)
        .set('Authorization', `Bearer ${accessToken}`).set('X-Family-Id', family.id)
        .send({ extendTo: new Date(Date.now() + HOUR).toISOString() });
      expect(isoDate.status).toBe(400);
    });
  });

  describe('tenant isolation', () => {
    it('family B cannot list, read, patch or delete family A shares', async () => {
      const familyA = await createFamilyWithMember();
      const folderA = await createFolder(familyA.family, familyA.membership);
      const docA = await createDocument(familyA.family, familyA.membership, folderA);

      const created = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${familyA.accessToken}`)
        .set('X-Family-Id', familyA.family.id)
        .send({ targetType: 'document', targetId: docA.id, duration: '24h' });
      const shareId = created.body.id;

      const familyB = await createFamilyWithMember();

      const listB = await request(app)
        .get('/api/shares')
        .set('Authorization', `Bearer ${familyB.accessToken}`)
        .set('X-Family-Id', familyB.family.id);
      expect(listB.status).toBe(200);
      expect(listB.body.items).toHaveLength(0);

      const patchB = await request(app)
        .patch(`/api/shares/${shareId}`)
        .set('Authorization', `Bearer ${familyB.accessToken}`)
        .set('X-Family-Id', familyB.family.id)
        .send({ revoke: true });
      expect(patchB.status).toBe(404);

      const deleteB = await request(app)
        .delete(`/api/shares/${shareId}`)
        .set('Authorization', `Bearer ${familyB.accessToken}`)
        .set('X-Family-Id', familyB.family.id);
      expect(deleteB.status).toBe(404);

      // The share must be untouched by family B's failed attempts.
      const stillThere = await Share.findById(shareId);
      expect(stillThere.revokedAt).toBeNull();
    });

    it('X-Family-Id header itself is validated: missing header is 400, a family the caller is not a member of is 403', async () => {
      const familyA = await createFamilyWithMember();

      const missingHeader = await request(app)
        .get('/api/shares')
        .set('Authorization', `Bearer ${familyA.accessToken}`);
      expect(missingHeader.status).toBe(400);
      expect(missingHeader.body.code).toBe('MISSING_FAMILY_ID');

      const familyB = await createFamilyWithMember();
      const wrongFamily = await request(app)
        .get('/api/shares')
        .set('Authorization', `Bearer ${familyA.accessToken}`)
        .set('X-Family-Id', familyB.family.id);
      expect(wrongFamily.status).toBe(403);
      expect(wrongFamily.body.code).toBe('NOT_A_MEMBER');
    });
  });
});
