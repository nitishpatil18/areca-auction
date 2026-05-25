import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

let app;
beforeAll(() => { app = createApp(); });

async function registerAndToken(overrides = {}) {
  const user = {
    name: 'Test User',
    email: `user-${Math.random().toString(36).slice(2, 8)}@test.com`,
    password: 'test1234',
    role: 'farmer',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(user);
  return { token: res.body.token, user: res.body.user };
}

const validLot = {
  variety: 'Rashi',
  grade: 'B',
  weightKg: 100,
  basePricePerKg: 350,
  moisturePct: 8,
  region: 'Shivamogga',
  description: 'Fresh harvest',
};

describe('GET /api/lots (public)', () => {
  it('returns empty list when no lots exist', async () => {
    const res = await request(app).get('/api/lots');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('returns lots with pagination metadata', async () => {
    const { token } = await registerAndToken();
    await request(app)
      .post('/api/lots')
      .set('Authorization', `Bearer ${token}`)
      .send(validLot)
      .expect(201);

    const res = await request(app).get('/api/lots');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].variety).toBe('Rashi');
    expect(res.body.total).toBe(1);
    expect(res.body.page).toBe(1);
  });

  it('filters by variety', async () => {
    const { token } = await registerAndToken();
    await request(app).post('/api/lots').set('Authorization', `Bearer ${token}`).send(validLot);
    await request(app).post('/api/lots').set('Authorization', `Bearer ${token}`).send({ ...validLot, variety: 'Bette' });

    const res = await request(app).get('/api/lots?variety=Bette');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].variety).toBe('Bette');
  });

  it('filters by price range', async () => {
    const { token } = await registerAndToken();
    await request(app).post('/api/lots').set('Authorization', `Bearer ${token}`).send({ ...validLot, basePricePerKg: 200 });
    await request(app).post('/api/lots').set('Authorization', `Bearer ${token}`).send({ ...validLot, basePricePerKg: 500 });
    await request(app).post('/api/lots').set('Authorization', `Bearer ${token}`).send({ ...validLot, basePricePerKg: 800 });

    const res = await request(app).get('/api/lots?minPrice=300&maxPrice=600');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].basePricePerKg).toBe(500);
  });

  it('sorts by priceAsc and priceDesc', async () => {
    const { token } = await registerAndToken();
    await request(app).post('/api/lots').set('Authorization', `Bearer ${token}`).send({ ...validLot, basePricePerKg: 300 });
    await request(app).post('/api/lots').set('Authorization', `Bearer ${token}`).send({ ...validLot, basePricePerKg: 100 });
    await request(app).post('/api/lots').set('Authorization', `Bearer ${token}`).send({ ...validLot, basePricePerKg: 500 });

    const asc = await request(app).get('/api/lots?sort=priceAsc');
    expect(asc.body.items.map((l) => l.basePricePerKg)).toEqual([100, 300, 500]);

    const desc = await request(app).get('/api/lots?sort=priceDesc');
    expect(desc.body.items.map((l) => l.basePricePerKg)).toEqual([500, 300, 100]);
  });

  it('rejects invalid variety in query with 400', async () => {
    const res = await request(app).get('/api/lots?variety=Banana');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/lots/:id', () => {
  it('returns the lot when it exists', async () => {
    const { token } = await registerAndToken();
    const create = await request(app).post('/api/lots').set('Authorization', `Bearer ${token}`).send(validLot);
    const lotId = create.body.lot._id;

    const res = await request(app).get(`/api/lots/${lotId}`);
    expect(res.status).toBe(200);
    expect(res.body.lot.variety).toBe('Rashi');
    expect(res.body.lot.farmer.name).toBe('Test User');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/lots/6a1030fed20db1498bfc0000');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/lots (farmer-only)', () => {
  it('creates a lot when called by farmer', async () => {
    const { token } = await registerAndToken();
    const res = await request(app)
      .post('/api/lots')
      .set('Authorization', `Bearer ${token}`)
      .send(validLot);
    expect(res.status).toBe(201);
    expect(res.body.lot.variety).toBe('Rashi');
    expect(res.body.lot.status).toBe('listed');
  });

  it('rejects without auth (401)', async () => {
    const res = await request(app).post('/api/lots').send(validLot);
    expect(res.status).toBe(401);
  });

  it('rejects when caller is a buyer (403)', async () => {
    const { token } = await registerAndToken({ role: 'buyer' });
    const res = await request(app)
      .post('/api/lots')
      .set('Authorization', `Bearer ${token}`)
      .send(validLot);
    expect(res.status).toBe(403);
  });

  it('rejects invalid variety with 400', async () => {
    const { token } = await registerAndToken();
    const res = await request(app)
      .post('/api/lots')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validLot, variety: 'Banana' });
    expect(res.status).toBe(400);
  });

  it('rejects missing weight with 400', async () => {
    const { token } = await registerAndToken();
    const { weightKg, ...partial } = validLot;
    const res = await request(app)
      .post('/api/lots')
      .set('Authorization', `Bearer ${token}`)
      .send(partial);
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/lots/:id (farmer-only)', () => {
  it('lets the owner update their own lot', async () => {
    const { token } = await registerAndToken();
    const create = await request(app).post('/api/lots').set('Authorization', `Bearer ${token}`).send(validLot);
    const lotId = create.body.lot._id;

    const res = await request(app)
      .patch(`/api/lots/${lotId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ basePricePerKg: 400 });

    expect(res.status).toBe(200);
    expect(res.body.lot.basePricePerKg).toBe(400);
  });

  it('rejects when caller is not the owner (403 or 404)', async () => {
    const owner = await registerAndToken();
    const other = await registerAndToken();
    const create = await request(app).post('/api/lots').set('Authorization', `Bearer ${owner.token}`).send(validLot);
    const lotId = create.body.lot._id;

    const res = await request(app)
      .patch(`/api/lots/${lotId}`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ basePricePerKg: 400 });

    expect([403, 404]).toContain(res.status);
  });
});

describe('DELETE /api/lots/:id (farmer-only)', () => {
  it('deletes the lot for the owner', async () => {
    const { token } = await registerAndToken();
    const create = await request(app).post('/api/lots').set('Authorization', `Bearer ${token}`).send(validLot);
    const lotId = create.body.lot._id;

    const del = await request(app)
      .delete(`/api/lots/${lotId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const get = await request(app).get(`/api/lots/${lotId}`);
    expect(get.status).toBe(404);
  });

  it('rejects without auth', async () => {
    const res = await request(app).delete('/api/lots/6a1030fed20db1498bfc0000');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/lots/mine (farmer-only)', () => {
  it('returns only the caller lots', async () => {
    const a = await registerAndToken();
    const b = await registerAndToken();
    await request(app).post('/api/lots').set('Authorization', `Bearer ${a.token}`).send(validLot);
    await request(app).post('/api/lots').set('Authorization', `Bearer ${a.token}`).send({ ...validLot, variety: 'Bette' });
    await request(app).post('/api/lots').set('Authorization', `Bearer ${b.token}`).send(validLot);

    const res = await request(app)
      .get('/api/lots/mine')
      .set('Authorization', `Bearer ${a.token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
  });

  it('rejects when caller is buyer (403)', async () => {
    const { token } = await registerAndToken({ role: 'buyer' });
    const res = await request(app)
      .get('/api/lots/mine')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
