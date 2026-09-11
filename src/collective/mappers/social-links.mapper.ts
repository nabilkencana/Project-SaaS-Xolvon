export function parseSkills(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);
}

/**
 * Parse the `social_links` TEXT column (JSON array per SCHEMA.md §56) into a
 * SocialLink array. Never null: malformed/absent values degrade to `[]`.
 */
export function parseSocialLinks(
  raw: string | null,
): { platform: string; url: string }[] {
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const links: { platform: string; url: string }[] = [];
  for (const entry of parsed) {
    if (entry === null || typeof entry !== 'object') {
      continue;
    }
    const record = entry as { platform?: unknown; url?: unknown };
    if (
      typeof record.platform === 'string' &&
      record.platform.length > 0 &&
      typeof record.url === 'string' &&
      record.url.length > 0
    ) {
      links.push({ platform: record.platform, url: record.url });
    }
  }
  return links;
}
