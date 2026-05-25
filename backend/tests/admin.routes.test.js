import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import User from '../src/models/User.js';

let app;
beforeAll(() => { app = createApp(); });

async function reg(role = 'buyer') {
  const email = `u-${Math.random().toString(36).slice(2, 8)}@test.com`;
  const res = await request(app).post('/api/auth/register').send({
    name: 'Test User', email, password: 'test1234', role,
  });
  return { token: res.body.token, user: res.body.user };
}

async function regAdmin() {
  // register as buyer then promote (register only allows farmer/buyer)
  const u = await reg('buyer');
  await User.findByIdAndUpdate(u.user.id, { role: 'admin' });
  // log back in to get a token with role=admin in the claims
  const res = await request(app).post('/api/auth/login').send({
    email: u.user.email, password: 'test1234',
  });
  return { token: res.body.token, user: res.body.user };
}

describe('admin routes — auth', () => {
  it('rejects without auth (401)', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('rejects non-admin (403)', async () => {
    const buyer = await reg('buyer');
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${buyer.token}`);
    expect(res.status).toBe(403);
  });

  it('allows admin (200)', async () => {
    const admin = await regAdmin();
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/admin/stats', () => {
  it('returns counts and aggregates', async () => {
    const admin = await regAdmin();
    await reg('farmer');
    await reg('buyer');

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toBeGreaterThanOrEqual(3);
    expect(res.body.usersByRole.admin).toBeGreaterThanOrEqual(1);
    expect(res.body.usersByRole.farmer).toBeGreaterThanOrEqual(1);
    expect(res.body.usersByRole.buyer).toBeGreaterThanOrEqual(1);
    expect(res.body.totalSettledValue).toBe(0);
    expect(res.body.failedSettlements).toBe(0);
    expect(Array.isArray(res.body.auctionsByDay)).toBe(true);
  });
});

describe('GET /api/admin/users', () => {
  it('returns all users, no passwordHash leaked', async () => {
    const admin = await regAdmin();
    await reg('farmer');
    await reg('buyer');

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(3);
    for (const u of res.body.items) {
      expect(u.passwordHash).toBeUndefined();
    }
  });
});

describe('PATCH /api/admin/users/:id/role', () => {
  it('changes a user role', async () => {
    const admin = await regAdmin();
    const target = await reg('buyer');

    const res = await request(app)
      .patch(`/api/admin/users/${target.user.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'farmer' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('farmer');
  });

  it('rejects invalid role (400)', async () => {
    const admin = await regAdmin();
    const target = await reg('buyer');

    const res = await request(app)
      .patch(`/api/admin/users/${target.user.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'super-admin' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown user id', async () => {
    const admin = await regAdmin();
    const res = await request(app)
      .patch('/api/admin/users/6a1030fed20db1498bfc0000/role')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'farmer' });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/admin/failed-settlements', () => {
  it('returns empty list when no failures exist', async () => {
    const admin = await regAdmin();
    const res = await request(app)
      .get('/api/admin/failed-settlements')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });
});

describe('GET /api/admin/pending-password-resets', () => {
  it('returns empty list when no resets pending', async () => {
    const admin = await regAdmin();
    const res = await request(app)
      .get('/api/admin/pending-password-resets')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('lists users with active reset tokens', async () => {
    const admin = await regAdmin();
    const target = await reg('buyer');

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: target.user.email });

    const res = await request(app)
      .get('/api/admin/pending-password-resets')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].email).toBe(target.user.email);
    expect(res.body.items[0].passwordResetToken).toBeTruthy();
  });
});
