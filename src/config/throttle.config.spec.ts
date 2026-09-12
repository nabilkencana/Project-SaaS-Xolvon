/**
 * Unit coverage for the T6 named throttler groups (addendum plan T6).
 *
 * Two layers are pinned here:
 *  1. The module-level tracker registry (src/config/throttle.config.ts):
 *     the preserved 100/min default plus the named abuse-surface groups.
 *     In @nestjs/throttler v6 a @Throttle override only takes effect for a
 *     name that is declared in ThrottlerModule.forRoot, and every declared
 *     tracker runs on every route — so the module-level limit of a named
 *     group is a benign placeholder and the real limits live on handlers.
 *  2. The per-handler decorator metadata on the target controllers, resolved
 *     with the guard's own rules (route value || module value; handler
 *     overrides class). This proves the tight limits are actually wired to
 *     the right abuse surfaces without needing a live server.
 */
import {
  THROTTLER_LIMIT,
  THROTTLER_SKIP,
  THROTTLER_TTL,
} from '@nestjs/throttler/dist/throttler.constants';
import type { ThrottlerOptions } from '@nestjs/throttler';

import { throttlerOptions } from './throttle.config';
import { AppController } from '../app.controller';
import { SearchController } from '../search/search.controller';
import { CoursesController } from '../courses/courses.controller';
import { ProjectsController } from '../projects/projects.controller';
import { MarketplaceController } from '../marketplace/marketplace.controller';
import { CollectiveController } from '../collective/collective.controller';
import { HomeController } from '../home/home.controller';
import { LessonsController } from '../lessons/lessons.controller';
import { MediaController } from '../media/media.controller';
import { OrdersController } from '../orders/orders.controller';
import { AuthController } from '../auth/auth.controller';

function namedOptions(): Record<string, ThrottlerOptions> {
  if (!Array.isArray(throttlerOptions)) {
    throw new Error('throttlerOptions must stay in the named-array form');
  }
  const byName: Record<string, ThrottlerOptions> = {};
  for (const option of throttlerOptions) {
    byName[option.name ?? 'default'] = option;
  }
  return byName;
}

/** Effective limit/ttl for one handler under one tracker (guard semantics). */
function effective(
  handler: Function,
  controller: Function,
  tracker: ThrottlerOptions,
): { limit: number; ttl: number } {
  const name = tracker.name ?? 'default';
  const get = (key: string) =>
    (Reflect.getMetadata(key + name, handler) as number | undefined) ??
    (Reflect.getMetadata(key + name, controller) as number | undefined);
  return {
    limit: get(THROTTLER_LIMIT) ?? (tracker.limit as number),
    ttl: get(THROTTLER_TTL) ?? (tracker.ttl as number),
  };
}

function skipped(handler: Function, name: string): boolean {
  return Reflect.getMetadata(THROTTLER_SKIP + name, handler) === true;
}

const ONE_MINUTE = 60_000;

describe('throttlerOptions (T6 named tracker registry)', () => {
  it('keeps the preserved global default of 100 req/min per IP per route', () => {
    const groups = namedOptions();
    expect(groups['default']).toBeDefined();
    expect(groups['default'].limit).toBe(100);
    expect(groups['default'].ttl).toBe(ONE_MINUTE);
  });

  it('declares the named abuse-surface groups search, catalog, signed and order', () => {
    const groups = namedOptions();
    expect(Object.keys(groups).sort()).toEqual(
      ['catalog', 'default', 'order', 'search', 'signed'].sort(),
    );
  });

  it('holds each named group at the benign module-level 100/min placeholder so undecorated routes are never throttled below the historical default', () => {
    const groups = namedOptions();
    for (const name of ['search', 'catalog', 'signed', 'order']) {
      expect(groups[name].limit).toBe(100);
      expect(groups[name].ttl).toBe(ONE_MINUTE);
    }
  });
});

describe('route-appropriate @Throttle metadata (T6 groups)', () => {
  const groups = () => namedOptions();

  it('GET /search is capped at 30/min by the search group', () => {
    const handler = SearchController.prototype.search;
    expect(effective(handler, SearchController, groups()['search'])).toEqual({
      limit: 30,
      ttl: ONE_MINUTE,
    });
  });

  it.each([
    ['courses', CoursesController, 'listPublished'],
    ['projects', ProjectsController, 'listPublished'],
    ['marketplace', MarketplaceController, 'listPublished'],
    ['collective', CollectiveController, 'listPublished'],
    ['home', HomeController, 'getHome'],
  ])('public catalog list GET /%s is capped at 30/min by the catalog group', (_path, controller, key) => {
    const handler = (controller as any).prototype[key];
    expect(effective(handler, controller, groups()['catalog'])).toEqual({
      limit: 30,
      ttl: ONE_MINUTE,
    });
  });

  it('GET /lessons/:id/video-url is capped at 10/min by the signed group', () => {
    expect(
      effective(
        LessonsController.prototype.videoUrl,
        LessonsController,
        groups()['signed'],
      ),
    ).toEqual({ limit: 10, ttl: ONE_MINUTE });
  });

  it('admin media URL generation (upload-url, read-url) is capped at 10/min by the signed group, confirm keeps the default', () => {
    for (const key of ['createUploadUrl', 'readUrl']) {
      expect(
        effective(
          (MediaController.prototype as any)[key],
          MediaController,
          groups()['signed'],
        ),
      ).toEqual({ limit: 10, ttl: ONE_MINUTE });
    }
    expect(
      effective(
        MediaController.prototype.confirm,
        MediaController,
        groups()['signed'],
      ).limit,
    ).toBe(100);
  });

  it('POST /orders checkout is capped at 10/min by the order group while sibling order routes keep the default', () => {
    expect(
      effective(
        OrdersController.prototype.checkout,
        OrdersController,
        groups()['order'],
      ),
    ).toEqual({ limit: 10, ttl: ONE_MINUTE });
    expect(
      effective(
        OrdersController.prototype.verifyOrder,
        OrdersController,
        groups()['order'],
      ).limit,
    ).toBe(100);
    expect(
      effective(
        OrdersController.prototype.submitPaymentProof,
        OrdersController,
        groups()['order'],
      ).limit,
    ).toBe(100);
  });

  it('GET /api health skips every declared tracker so it can never be throttled', () => {
    const handler = AppController.prototype.getHello;
    for (const name of ['default', 'search', 'catalog', 'signed', 'order']) {
      expect(skipped(handler, name)).toBe(true);
    }
  });

  it('preserves the DL-012 auth 5/min overrides untouched (T6 must not regress them)', () => {
    const auth = groups()['default'];
    for (const key of ['register', 'login']) {
      const handler = (AuthController.prototype as any)[key];
      expect(effective(handler, AuthController, auth)).toEqual({
        limit: 5,
        ttl: ONE_MINUTE,
      });
    }
  });

  it('leaves non-target public reads (course detail by slug) on the historical 100/min default', () => {
    expect(
      effective(
        CoursesController.prototype.getPublishedBySlug,
        CoursesController,
        groups()['default'],
      ),
    ).toEqual({ limit: 100, ttl: ONE_MINUTE });
    expect(
      effective(
        CoursesController.prototype.getPublishedBySlug,
        CoursesController,
        groups()['catalog'],
      ).limit,
    ).toBe(100);
  });
});
