/**
 * Throttler configuration (addendum plan T6).
 *
 * In @nestjs/throttler v6 the guard only evaluates trackers that are
 * declared in ThrottlerModule.forRoot, and every declared tracker runs on
 * every route (counters are keyed per controller+handler+tracker+client-IP).
 * A route-level @Throttle override therefore REQUIRES the group name to
 * exist here, and a group declared here with a tight module-level limit
 * would throttle UNRELATED routes. To get named, route-appropriate abuse
 * limits without touching anything else, each abuse-surface group is
 * registered at the benign module-level placeholder (same 100/min budget as
 * the preserved global default, so undecorated routes keep their historical
 * behavior) and handlers tighten it via the exported override constants
 * below. Effective limit of a decorated route = min(overrides).
 */
import { minutes } from '@nestjs/throttler';
import type { ThrottlerModuleOptions, ThrottlerOptions } from '@nestjs/throttler';

/** Canonical window for every group (helper avoids raw-millisecond mistakes). */
export const THROTTLE_TTL = minutes(1);

/** Preserved global default — 100 req/min/IP/route (DL-012 baseline). */
export const THROTTLE_DEFAULT_LIMIT = 100;

/** Tight per-route budgets for the named abuse surfaces (T6). */
export const THROTTLE_SEARCH_LIMIT = 30;
export const THROTTLE_CATALOG_LIMIT = 30;
export const THROTTLE_SIGNED_LIMIT = 10;
export const THROTTLE_ORDER_LIMIT = 10;

/** Module-level registry: default + named groups at the benign placeholder. */
export const throttlerOptions: ThrottlerModuleOptions = [
  { name: 'default', ttl: THROTTLE_TTL, limit: THROTTLE_DEFAULT_LIMIT },
  { name: 'search', ttl: THROTTLE_TTL, limit: THROTTLE_DEFAULT_LIMIT },
  { name: 'catalog', ttl: THROTTLE_TTL, limit: THROTTLE_DEFAULT_LIMIT },
  { name: 'signed', ttl: THROTTLE_TTL, limit: THROTTLE_DEFAULT_LIMIT },
  { name: 'order', ttl: THROTTLE_TTL, limit: THROTTLE_DEFAULT_LIMIT },
];

type GroupOverride = Record<string, Pick<ThrottlerOptions, 'limit' | 'ttl'>>;

/** GET /api/search — anonymous cross-entity search is the scrape surface. */
export const SEARCH_THROTTLE: GroupOverride = {
  search: { limit: THROTTLE_SEARCH_LIMIT, ttl: THROTTLE_TTL },
};

/** Public catalog list endpoints (/courses, /projects, /marketplace, /collective, /home). */
export const CATALOG_THROTTLE: GroupOverride = {
  catalog: { limit: THROTTLE_CATALOG_LIMIT, ttl: THROTTLE_TTL },
};

/** Signed-media URL issuance (lesson video-url, admin media upload/read-url). */
export const SIGNED_THROTTLE: GroupOverride = {
  signed: { limit: THROTTLE_SIGNED_LIMIT, ttl: THROTTLE_TTL },
};

/** POST /orders checkout — bounded, looser than auth but abuse-resistant. */
export const ORDER_THROTTLE: GroupOverride = {
  order: { limit: THROTTLE_ORDER_LIMIT, ttl: THROTTLE_TTL },
};

/**
 * Health probe exemption — skips EVERY declared tracker (explicitly listed
 * because @SkipThrottle() without arguments only skips 'default'), so the
 * load-balancer/deploy probe and the e2e health assertions can never be
 * throttled unexpectedly.
 */
export const HEALTH_SKIP_THROTTLE: Record<string, boolean> = {
  default: true,
  search: true,
  catalog: true,
  signed: true,
  order: true,
};
