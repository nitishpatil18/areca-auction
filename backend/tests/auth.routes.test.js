import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

let app;

beforeAll(() => {
  app = createApp();
});

const validUser = {
  name: 'Integration Test',
  email: 'integration@test.com',
  password: 'test1234',
  role: 'buyer',
};

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token (201)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.role).toBe('buyer');
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send(validUser).expect(201);
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already/i);
  });

  it('rejects missing required fields with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad@test.com' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid email format with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('rejects short password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, password: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid role with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, role: 'super-admin' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    // register fresh user for each describe via beforeEach setup is too heavy;
    // tests below each register inline
  });

  it('returns token on valid credentials (200)', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(validUser.email);
  });

  it('rejects wrong password with 401', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'whatever' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user when authorized (200)', async () => {
    const reg = await request(app).post('/api/auth/register').send(validUser);
    const token = reg.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
  });

  it('rejects without token (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects malformed token (401)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('returns ok even for unknown emails (no enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'unknown@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns ok and sets reset token in db for known users', async () => {
    await request(app).post('/api/auth/register').send(validUser);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: validUser.email });

    expect(res.status).toBe(200);

    // verify token was actually stored
    const User = (await import('../src/models/User.js')).default;
    const user = await User.findOne({ email: validUser.email });
    expect(user.passwordResetToken).toBeTruthy();
    expect(user.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects invalid email format with 400', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('resets password with valid token (200)', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    await request(app).post('/api/auth/forgot-password').send({ email: validUser.email });

    const User = (await import('../src/models/User.js')).default;
    const user = await User.findOne({ email: validUser.email });
    const token = user.passwordResetToken;

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'newpass1234' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // old password no longer works
    const loginOld = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(loginOld.status).toBe(401);

    // new password works
    const loginNew = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'newpass1234' });
    expect(loginNew.status).toBe(200);
  });

  it('rejects invalid token with 400', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'a'.repeat(64), newPassword: 'anypassword' });
    expect(res.status).toBe(400);
  });

  it('rejects short new password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'a'.repeat(64), newPassword: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects malformed token length with 400', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'tooshort', newPassword: 'validpassword' });
    expect(res.status).toBe(400);
  });

  it('cannot reuse a consumed token', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    await request(app).post('/api/auth/forgot-password').send({ email: validUser.email });

    const User = (await import('../src/models/User.js')).default;
    const user = await User.findOne({ email: validUser.email });
    const token = user.passwordResetToken;

    // first use succeeds
    await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'newpass1234' })
      .expect(200);

    // second use fails
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'anothernew1234' });
    expect(res.status).toBe(400);
  });
});
