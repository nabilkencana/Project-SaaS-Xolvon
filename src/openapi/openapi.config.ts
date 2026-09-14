import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';

/**
 * Security-scheme id referenced by `@ApiBearerAuth(OPENAPI_BEARER_SCHEME)`
 * on every guarded handler and by the exported OpenAPI document.
 */
export const OPENAPI_BEARER_SCHEME = 'bearerAuth';

/**
 * Builds the OpenAPI document options. The contract is Bearer-JWT-only
 * (DL-016): the scheme below is the single documented security model, and
 * no cookie/CSRF flow is advertised.
 */
export function createOpenApiOptions() {
  return new DocumentBuilder()
    .setTitle('Xolvon Backend API')
    .setDescription(
      'HTTP contract for the Xolvon backend (global prefix /api). Auth: ' +
        '`Authorization: Bearer <accessToken>` (JWT, issued by ' +
        'POST /api/auth/register and POST /api/auth/login). Public routes ' +
        'need no credentials; routes listed with bearer security reject ' +
        'missing or invalid tokens with 401.',
    )
    .setVersion('1.0.0')
    .addServer('/')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'JWT access token. Send it as `Authorization: Bearer <accessToken>`.',
      },
      OPENAPI_BEARER_SCHEME,
    )
    .build();
}

/**
 * Generates the OpenAPI 3 document for a bootstrapped (initialized) Nest
 * application. Used by the runtime Swagger UI, export script, and contract
 * e2e spec.
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, createOpenApiOptions());
}

/** Credential-shaped string values that must never appear in the document. */
const SECRET_VALUE_PATTERNS: ReadonlyArray<[string, RegExp]> = [
  // Real JWT (three dot-separated base64url segments), not placeholders.
  [
    'jwt-like value',
    /^eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+$/,
  ],
  // AWS access key ids.
  ['aws access key id', /AKIA[0-9A-Z]{16}/],
  // A live-looking bearer/basic credential in a value (placeholders such as
  // "Bearer <accessToken>" do not match because of the angle brackets).
  [
    'bearer/basic credential value',
    /^(?:Bearer|Basic)\s+(?![<{])[A-Za-z0-9+/=._-]{20,}/i,
  ],
  // Private keys.
  [
    'private key material',
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  ],
];

/**
 * Recursively scans the VALUES of a parsed OpenAPI document (property names
 * are legitimately words like `password`) and returns the JSON paths of any
 * string that looks like a real credential. An empty array means clean.
 */
export function findSecretLeaks(value: unknown, path = ''): string[] {
  const leaks: string[] = [];
  if (typeof value === 'string') {
    for (const [, pattern] of SECRET_VALUE_PATTERNS) {
      if (pattern.test(value)) {
        leaks.push(path || '<root>');
        break;
      }
    }
    return leaks;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      leaks.push(...findSecretLeaks(item, `${path}[${index}]`));
    });
    return leaks;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      leaks.push(...findSecretLeaks(child, path ? `${path}.${key}` : key));
    }
  }
  return leaks;
}
