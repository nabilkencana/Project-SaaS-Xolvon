/**
 * Offline OpenAPI JSON export (plan T10).
 *
 * Bootstraps the real Nest application (never listens on a port), builds the
 * OpenAPI document with `SwaggerModule.createDocument` from
 * `src/openapi/openapi.config.ts`, verifies that every registered HTTP route
 * appears in the document, and writes the result to `docs/openapi.json`.
 *
 * The application itself never serves a Swagger UI (DL-028): this script is
 * the only consumer of the document factory.
 *
 * Safety: the export must never talk to staging/production services, so the
 * local drivers are forced here regardless of `.env` (dotenv does not
 * override variables already present in `process.env`).
 */
import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from '../app.module';
import { createOpenApiDocument } from './openapi.config';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

interface ExpressRouteLike {
  path: string;
  methods: Record<string, boolean>;
}

interface LayerLike {
  route?: ExpressRouteLike;
  handle?: { router?: { stack: LayerLike[] }; stack?: LayerLike[] };
  stack?: LayerLike[];
}

interface HttpServerLike {
  _router?: { stack: LayerLike[] };
  router?: { stack: LayerLike[] };
}

function collectLayers(stack: LayerLike[], found: ExpressRouteLike[]): void {
  for (const layer of stack) {
    if (layer.route) {
      found.push(layer.route);
      continue;
    }
    const nested =
      layer.handle?.router?.stack ?? layer.handle?.stack ?? layer.stack;
    if (nested) collectLayers(nested, found);
  }
}

/** Registered Express routes as `METHOD /openapi/path` keys (`:id` → `{id}`). */
function liveRouteKeys(server: HttpServerLike): string[] {
  const stack = server._router?.stack ?? server.router?.stack;
  if (!stack) {
    throw new Error(
      'export-openapi: could not enumerate the Express router stack; ' +
        'refusing to emit an unverified document',
    );
  }
  const routes: ExpressRouteLike[] = [];
  collectLayers(stack, routes);
  const keys: string[] = [];
  for (const route of routes) {
    const openApiPath = route.path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
    for (const method of HTTP_METHODS) {
      if (route.methods[method]) keys.push(`${method} ${openApiPath}`);
    }
  }
  return keys;
}

async function main(): Promise<void> {
  // Force the local, offline configuration BEFORE any module reads env.
  process.env['APP_ENV'] = 'local';
  process.env['DB_DRIVER'] = 'sqlite';
  process.env['STORAGE_DRIVER'] = 'local-test';
  process.env['JWT_SECRET'] ??=
    'docs-openapi-export-only-not-a-real-secret-0123456789';
  process.env['FRONTEND_URL'] ??= 'http://localhost:3001';

  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    app.setGlobalPrefix('api');
    await app.init();

    const document = createOpenApiDocument(app) as {
      paths: Record<string, Record<string, unknown>>;
    };

    const live = liveRouteKeys(app.getHttpAdapter().getInstance() as HttpServerLike);
    const missing = live.filter(
      (key) => {
        const [method, path] = key.split(' ') as [string, string];
        return document.paths[path]?.[method] === undefined;
      },
    );
    const documented = Object.entries(document.paths).flatMap(([path, ops]) =>
      HTTP_METHODS.filter((m) => ops[m] !== undefined).map((m) => `${m} ${path}`),
    );
    const undocumented = documented.filter((key) => !live.includes(key));

    if (live.length === 0) {
      throw new Error('export-openapi: zero live routes enumerated');
    }
    if (missing.length > 0 || undocumented.length > 0) {
      for (const route of missing) {
        process.stderr.write(`export-openapi: MISSING from document: ${route}\n`);
      }
      for (const route of undocumented) {
        process.stderr.write(`export-openapi: UNDOCUMENTED route: ${route}\n`);
      }
      process.exitCode = 1;
      return;
    }

    const target = join(process.cwd(), 'docs', 'openapi.json');
    writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    process.stdout.write(
      `export-openapi: wrote ${target} — ` +
        `${new Set(live.map((k) => k.split(' ')[1])).size} paths, ` +
        `${live.length} operations, all ${live.length} live routes covered\n`,
    );
  } finally {
    await app.close();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/export-openapi.ts')) {
  void main()
    .catch((error: unknown) => {
      process.stderr.write(
        `export-openapi failed: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    });
}
