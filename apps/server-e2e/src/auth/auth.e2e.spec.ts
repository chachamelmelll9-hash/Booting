const api = (path: string) => `${process.env.API_BASE_URL}${path}`;

const postJson = (path: string, body: unknown) =>
  fetch(api(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('auth e2e', () => {
  it('GET /api responds', async () => {
    const res = await fetch(api('/api'));
    expect(res.status).toBeLessThan(500);
  });

  it('POST /api/auth/login rejects invalid credentials', async () => {
    const res = await postJson('/api/auth/login', {
      email: 'nobody@example.com',
      password: 'definitely-wrong-password',
    });
    expect(res.ok).toBe(false);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('POST /api/auth/login rejects malformed payload', async () => {
    const res = await postJson('/api/auth/login', { email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});
