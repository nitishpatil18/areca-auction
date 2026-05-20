import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { registerUser, loginUser, getMe } from '../src/services/authService.js';
import User from '../src/models/User.js';

const validInput = {
  name: 'Test Farmer',
  email: 'farmer@test.com',
  password: 'test1234',
  role: 'farmer',
};

describe('authService.registerUser', () => {
  it('creates a user and returns a valid token on the happy path', async () => {
    const result = await registerUser(validInput);

    expect(result.user.id).toBeTruthy();
    expect(result.user.name).toBe('Test Farmer');
    expect(result.user.email).toBe('farmer@test.com');
    expect(result.user.role).toBe('farmer');
    expect(result.token).toBeTruthy();

    const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(result.user.id);
    expect(decoded.role).toBe('farmer');
    expect(decoded.email).toBe('farmer@test.com');
  });

  it('hashes the password and never returns it', async () => {
    const result = await registerUser(validInput);

    expect(result.user.passwordHash).toBeUndefined();
    expect(result.user.password).toBeUndefined();

    const dbUser = await User.findById(result.user.id);
    expect(dbUser.passwordHash).toBeTruthy();
    expect(dbUser.passwordHash).not.toBe(validInput.password);
    expect(dbUser.passwordHash.startsWith('$2')).toBe(true);
  });

  it('lowercases the email automatically', async () => {
    const result = await registerUser({ ...validInput, email: 'MIXED@Case.COM' });
    expect(result.user.email).toBe('mixed@case.com');
  });

  it('throws 409 conflict on duplicate email', async () => {
    await registerUser(validInput);

    await expect(registerUser(validInput)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('email'),
    });
  });
});

describe('authService.loginUser', () => {
  it('returns user + token on correct credentials', async () => {
    await registerUser(validInput);

    const result = await loginUser({
      email: validInput.email,
      password: validInput.password,
    });

    expect(result.user.email).toBe(validInput.email);
    expect(result.token).toBeTruthy();
  });

  it('throws 401 on wrong password', async () => {
    await registerUser(validInput);

    await expect(
      loginUser({ email: validInput.email, password: 'wrong-password' })
    ).rejects.toMatchObject({ status: 401 });
  });

  it('throws 401 when the email does not exist', async () => {
    await expect(
      loginUser({ email: 'nobody@test.com', password: 'whatever' })
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe('authService.getMe', () => {
  it('returns the safe user shape for an existing id', async () => {
    const { user } = await registerUser(validInput);

    const me = await getMe(user.id);
    expect(me.id).toBe(user.id);
    expect(me.email).toBe(validInput.email);
    expect(me.passwordHash).toBeUndefined();
  });

  it('throws 400 when the user does not exist', async () => {
    await expect(
      getMe('6a0a0a0a0a0a0a0a0a0a0a0a')
    ).rejects.toMatchObject({ status: 400 });
  });
});
