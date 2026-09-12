import {
  OPENAPI_BEARER_SCHEME,
  findSecretLeaks,
} from './openapi.config';

// Not implemented yet — RED target for the T10 secret-scan helper.
describe('openapi.config (unit)', () => {
  it('exposes the bearer scheme id used across decorators', () => {
    expect(OPENAPI_BEARER_SCHEME).toBe('bearerAuth');
  });

  it('reports no leaks for a clean document, even when property NAMES mention password', () => {
    const doc = {
      components: {
        schemas: {
          LoginDto: {
            properties: {
              email: { type: 'string', example: 'user@example.com' },
              password: { type: 'string', description: 'Account password.' },
            },
          },
        },
      },
      paths: {
        '/api/auth/login': {
          post: {
            security: [{ bearerAuth: [] }],
            description:
              'Send the token as `Authorization: Bearer <accessToken>`.',
          },
        },
      },
    };
    expect(findSecretLeaks(doc)).toEqual([]);
  });

  it('flags a JWT-shaped string value', () => {
    const doc = { info: { description: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4In0.abcDEF_signature' } };
    expect(findSecretLeaks(doc).length).toBe(1);
  });

  it('flags an AWS-style access key value', () => {
    const doc = { x: { y: 'AKIAABCDEFGHIJKLMNOP' } };
    expect(findSecretLeaks(doc)).toContain('x.y');
  });

  it('flags a live-looking Bearer credential value', () => {
    const doc = { examples: { a: 'Bearer eyJhbGciOiJIUzI1NiJ9.c29tZXBheWxvYWQ.signature' } };
    expect(findSecretLeaks(doc).length).toBe(1);
  });
});
