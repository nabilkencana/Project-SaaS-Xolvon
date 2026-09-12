import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestIntegrityGuard } from './request-integrity.guard';

describe('RequestIntegrityGuard', () => {
  let guard: RequestIntegrityGuard;
  const configService = {
    get: jest.fn().mockReturnValue('http://localhost:3001,https://app.example.com'),
  } as unknown as ConfigService;

  beforeEach(() => {
    configService.get = jest
      .fn()
      .mockReturnValue('http://localhost:3001,https://app.example.com');
    guard = new RequestIntegrityGuard(configService);
  });

  function context(method: string, headers: Record<string, string> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ method, headers }) }),
    } as unknown as ExecutionContext;
  }

  it('allows a mutation from a configured Origin', () => {
    expect(
      guard.canActivate(
        context('POST', { origin: 'https://app.example.com' }),
      ),
    ).toBe(true);
  });

  it('rejects a mutation from a disallowed Origin', () => {
    expect(() =>
      guard.canActivate(context('PATCH', { origin: 'https://evil.example' })),
    ).toThrow(ForbiddenException);
  });

  it('allows a bearer service mutation with absent browser metadata', () => {
    expect(
      guard.canActivate(
        context('DELETE', { authorization: 'Bearer service-token' }),
      ),
    ).toBe(true);
  });

  it('rejects a mutation with cross-site fetch metadata', () => {
    expect(() =>
      guard.canActivate(context('POST', { 'sec-fetch-site': 'cross-site' })),
    ).toThrow(ForbiddenException);
  });

  it('rejects a mutation with a disallowed Referer origin', () => {
    expect(() =>
      guard.canActivate(
        context('DELETE', { referer: 'https://evil.example/form' }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('leaves GET requests unaffected by browser metadata', () => {
    expect(
      guard.canActivate(context('GET', { origin: 'https://evil.example' })),
    ).toBe(true);
  });
});
