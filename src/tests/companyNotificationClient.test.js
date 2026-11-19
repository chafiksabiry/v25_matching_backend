// Run: JWT_SECRET=test node --test src/tests/companyNotificationClient.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import axios from 'axios';
import mongoose from 'mongoose';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const { notifyCompanyOfEnrollment, notifyCompanyOfNewMatches, signServiceToken } = await import('../services/companyNotificationClient.js');
const { default: CompanyMatchSeen } = await import('../models/CompanyMatchSeen.js');

const oid = () => new mongoose.Types.ObjectId();
let posts;
const respondWith = (status) => {
  posts = [];
  axios.post = async (url, body, config) => {
    posts.push({ url, body, config });
    return { status };
  };
};

// Real Mongoose documents carry ObjectIds (not strings): reading their id used to recurse forever.
const gig = () => ({ _id: oid(), companyId: oid(), title: 'Télévendeur en mutuelle' });
const rep = () => ({ _id: oid(), personalInfo: { name: 'Loubna EL FAKIRI' } });

test('a REP application notifies the company, with ObjectId ids', async () => {
  respondWith(201);
  const g = gig();
  const ok = await notifyCompanyOfEnrollment({ type: 'requested', agent: rep(), gig: g, enrollmentId: oid() });
  assert.equal(ok, true);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].body.companyId, g.companyId.toHexString());
  assert.equal(posts[0].body.gigId, g._id.toHexString());
  assert.equal(posts[0].body.kind, 'enrollment_request');
  assert.match(posts[0].body.message, /Loubna EL FAKIRI.*Télévendeur en mutuelle/);
  assert.match(posts[0].url, /\/internal\/company-notifications$/);
});

test('populated documents, plain strings and { $oid } shapes all resolve', async () => {
  respondWith(201);
  const cid = oid();
  const shapes = [cid.toHexString(), cid, { _id: cid }, { $oid: cid.toHexString() }];
  for (const companyId of shapes) {
    posts.length = 0;
    await notifyCompanyOfEnrollment({ type: 'accepted', agent: rep(), gig: { _id: oid(), companyId, title: 'G' }, enrollmentId: oid() });
    assert.equal(posts[0]?.body.companyId, cid.toHexString());
  }
});

test('accept / decline map to their own notification kinds', async () => {
  respondWith(201);
  await notifyCompanyOfEnrollment({ type: 'accepted', agent: rep(), gig: gig(), enrollmentId: oid() });
  await notifyCompanyOfEnrollment({ type: 'rejected', agent: rep(), gig: gig(), enrollmentId: oid() });
  assert.deepEqual(posts.map((p) => p.body.kind), ['enrollment_accepted', 'enrollment_rejected']);
});

test('the service token is a short-lived company-notify JWT signed with the shared secret', async () => {
  respondWith(201);
  await notifyCompanyOfEnrollment({ type: 'requested', agent: rep(), gig: gig(), enrollmentId: oid() });
  const token = posts[0].config.headers.Authorization.replace('Bearer ', '');
  const [h, p, sig] = token.split('.');
  assert.equal(crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${h}.${p}`).digest('base64url'), sig);
  const claims = JSON.parse(Buffer.from(p, 'base64url'));
  assert.equal(claims.scope, 'company-notify');
  assert.ok(claims.exp - claims.iat <= 120);
  assert.equal(signServiceToken(''), null);
});

test('a rejection by the orchestrator is reported, never swallowed silently', async () => {
  respondWith(401);
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.join(' '));
  try {
    assert.equal(await notifyCompanyOfEnrollment({ type: 'requested', agent: rep(), gig: gig(), enrollmentId: oid() }), null);
  } finally {
    console.error = original;
  }
  assert.ok(logged.some((l) => /HTTP 401/.test(l)), `expected an HTTP 401 log, got: ${logged}`);
});

test('a gig without company is skipped with a warning (no request sent)', async () => {
  respondWith(201);
  const warned = [];
  const original = console.warn;
  console.warn = (...args) => warned.push(args.join(' '));
  try {
    assert.equal(await notifyCompanyOfEnrollment({ type: 'requested', agent: rep(), gig: { _id: oid(), title: 'G' }, enrollmentId: oid() }), null);
  } finally {
    console.warn = original;
  }
  assert.equal(posts.length, 0);
  assert.ok(warned.some((w) => /skipped/.test(w)));
});

test('new matches: profiles are only marked as seen if the company was really notified', async () => {
  const g = gig();
  const match = (pct) => ({ agentId: oid(), totalMatchingScore: pct, agentInfo: { personalInfo: { name: 'Sam Rep' } } });
  const stored = [];
  const deleted = [];
  CompanyMatchSeen.find = () => ({ select: () => ({ lean: async () => [] }) });
  CompanyMatchSeen.insertMany = async (rows) => { stored.push(...rows); return rows; };
  CompanyMatchSeen.deleteMany = async (filter) => { deleted.push(filter); return {}; };

  respondWith(201);
  assert.equal(await notifyCompanyOfNewMatches({ gig: g, matches: [match(80)] }), 1);
  assert.equal(stored.length, 1);
  assert.equal(deleted.length, 0, 'kept as seen after a successful push');

  respondWith(401);
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(await notifyCompanyOfNewMatches({ gig: g, matches: [match(75)] }), null);
  } finally {
    console.error = original;
  }
  assert.equal(deleted.length, 1, 'a failed push unregisters the profiles so the next scan retries them');
});
