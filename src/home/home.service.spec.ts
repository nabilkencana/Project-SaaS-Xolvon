import 'reflect-metadata';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseService } from '../database/database.service';
import { runMigrations } from '../database/migrate';
import { HomeService } from './home.service';

const MIGRATIONS_DIR = join(process.cwd(), 'src', 'database', 'migrations');

/**
 * Home aggregation (plan T10). Uses a real temp SQLite database so the
 * published-only guarantee is proven against actual SQL, not mocks.
 */

interface SeedRow {
  id: string;
  slug: string;
  createdAt: string;
  status?: 'draft' | 'published';
  displayOrder?: number;
}

const insertCourse = async (db: DatabaseService, row: SeedRow): Promise<void> => {
  await db.execute(
    'INSERT INTO courses (id, title, slug, description, price, thumbnail_url, status, created_at, updated_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      row.id,
      `Course ${row.id}`,
      row.slug,
      `Outcome ${row.id}`,
      150000,
      `https://cdn.example.com/${row.slug}.jpg`,
      row.status ?? 'published',
      row.createdAt,
      row.createdAt,
    ],
  );
};

const insertProject = async (db: DatabaseService, row: SeedRow): Promise<void> => {
  await db.execute(
    'INSERT INTO projects (id, title, slug, type, summary, status, created_at, updated_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      row.id,
      `Project ${row.id}`,
      row.slug,
      'saas',
      `Summary ${row.id}`,
      row.status ?? 'published',
      row.createdAt,
      row.createdAt,
    ],
  );
};

const insertMarketplaceItem = async (db: DatabaseService, row: SeedRow): Promise<void> => {
  await db.execute(
    'INSERT INTO marketplace_items (id, title, slug, description, external_url, status, created_at, updated_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      row.id,
      `Item ${row.id}`,
      row.slug,
      `Description ${row.id}`,
      `https://example.com/${row.slug}`,
      row.status ?? 'published',
      row.createdAt,
      row.createdAt,
    ],
  );
};

const insertMember = async (db: DatabaseService, row: SeedRow): Promise<void> => {
  await db.execute(
    'INSERT INTO collective_members (id, name, slug, photo, role, skills, bio, social_links, status, display_order, created_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      row.id,
      `Member ${row.id}`,
      row.slug,
      `https://cdn.example.com/${row.slug}.jpg`,
      'Engineer',
      JSON.stringify(['typescript']),
      `Bio ${row.id}`,
      JSON.stringify(['https://github.com/xolvon']),
      row.status ?? 'published',
      row.displayOrder ?? 0,
      row.createdAt,
    ],
  );
};

describe('HomeService', () => {
  let tempDir: string;
  let db: DatabaseService;
  let service: HomeService;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'xolvon-home-'));
    db = new DatabaseService(join(tempDir, 'local.db'));
    await runMigrations(db, MIGRATIONS_DIR);
    service = new HomeService(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('aggregates the four published sections and maps rows to card DTOs', async () => {
    await insertCourse(db, { id: 'c-1', slug: 'course-1', createdAt: '2026-01-01T00:00:00.000Z' });
    await insertProject(db, { id: 'p-1', slug: 'project-1', createdAt: '2026-01-01T00:00:00.000Z' });
    await insertMarketplaceItem(db, { id: 'm-1', slug: 'item-1', createdAt: '2026-01-01T00:00:00.000Z' });
    await insertMember(db, { id: 'cm-1', slug: 'member-1', createdAt: '2026-01-01T00:00:00.000Z' });

    const home = await service.getHome();

    expect(home.courses).toEqual([
      {
        id: 'c-1',
        title: 'Course c-1',
        slug: 'course-1',
        description: 'Outcome c-1',
        price: 150000,
        thumbnailUrl: 'https://cdn.example.com/course-1.jpg',
      },
    ]);
    expect(home.projects).toEqual([
      {
        id: 'p-1',
        title: 'Project p-1',
        slug: 'project-1',
        summary: 'Summary p-1',
      },
    ]);
    expect(home.marketplace).toEqual([
      {
        id: 'm-1',
        title: 'Item m-1',
        slug: 'item-1',
        description: 'Description m-1',
        externalUrl: 'https://example.com/item-1',
      },
    ]);
    expect(home.collective).toEqual([
      {
        id: 'cm-1',
        name: 'Member cm-1',
        slug: 'member-1',
        photo: 'https://cdn.example.com/member-1.jpg',
        role: 'Engineer',
        skills: ['typescript'],
        socialLinks: ['https://github.com/xolvon'],
      },
    ]);
  });

  it('never leaks draft or unpublished content from any section', async () => {
    await insertCourse(db, { id: 'c-pub', slug: 'course-pub', createdAt: '2026-01-01T00:00:00.000Z' });
    await insertCourse(db, { id: 'c-draft', slug: 'course-draft', createdAt: '2026-01-02T00:00:00.000Z', status: 'draft' });
    await insertProject(db, { id: 'p-pub', slug: 'project-pub', createdAt: '2026-01-01T00:00:00.000Z' });
    await insertProject(db, { id: 'p-draft', slug: 'project-draft', createdAt: '2026-01-02T00:00:00.000Z', status: 'draft' });
    await insertMarketplaceItem(db, { id: 'm-pub', slug: 'item-pub', createdAt: '2026-01-01T00:00:00.000Z' });
    await insertMarketplaceItem(db, { id: 'm-draft', slug: 'item-draft', createdAt: '2026-01-02T00:00:00.000Z', status: 'draft' });
    await insertMember(db, { id: 'cm-pub', slug: 'member-pub', createdAt: '2026-01-01T00:00:00.000Z' });
    await insertMember(db, { id: 'cm-draft', slug: 'member-draft', createdAt: '2026-01-02T00:00:00.000Z', status: 'draft' });

    const home = await service.getHome();
    const serialized = JSON.stringify(home);

    expect(home.courses.map((c) => c.id)).toEqual(['c-pub']);
    expect(home.projects.map((p) => p.id)).toEqual(['p-pub']);
    expect(home.marketplace.map((m) => m.id)).toEqual(['m-pub']);
    expect(home.collective.map((m) => m.id)).toEqual(['cm-pub']);
    expect(serialized).not.toContain('course-draft');
    expect(serialized).not.toContain('project-draft');
    expect(serialized).not.toContain('item-draft');
    expect(serialized).not.toContain('member-draft');
  });

  it('caps each section at its limit and keeps only the latest rows', async () => {
    for (let i = 1; i <= 6; i += 1) {
      const stamp = `2026-01-0${i}T00:00:00.000Z`;
      await insertCourse(db, { id: `c-${i}`, slug: `course-${i}`, createdAt: stamp });
      await insertProject(db, { id: `p-${i}`, slug: `project-${i}`, createdAt: stamp });
      await insertMarketplaceItem(db, { id: `m-${i}`, slug: `item-${i}`, createdAt: stamp });
    }
    for (let i = 1; i <= 23; i += 1) {
      await insertMember(db, {
        id: `cm-${i}`,
        slug: `member-${i}`,
        createdAt: `2026-01-${String(i).padStart(2, '0')}T00:00:00.000Z`,
        displayOrder: i,
      });
    }

    const home = await service.getHome();

    expect(home.courses).toHaveLength(4);
    expect(home.courses.map((c) => c.id)).toEqual(['c-6', 'c-5', 'c-4', 'c-3']);
    expect(home.projects).toHaveLength(4);
    expect(home.projects.map((p) => p.id)).toEqual(['p-6', 'p-5', 'p-4', 'p-3']);
    expect(home.marketplace).toHaveLength(4);
    expect(home.marketplace.map((m) => m.id)).toEqual(['m-6', 'm-5', 'm-4', 'm-3']);
    expect(home.collective).toHaveLength(20);
    // display_order ASC: lowest 20 of the 23 members (cm-1 .. cm-20).
    expect(home.collective[home.collective.length - 1]?.id).toBe('cm-20');
    expect(home.collective.map((m) => m.id)).not.toContain('cm-21');
  });

  it('sorts collective by display_order ASC then created_at DESC', async () => {
    await insertMember(db, { id: 'cm-a', slug: 'member-a', createdAt: '2026-01-01T00:00:00.000Z', displayOrder: 2 });
    await insertMember(db, { id: 'cm-b', slug: 'member-b', createdAt: '2026-02-01T00:00:00.000Z', displayOrder: 1 });
    await insertMember(db, { id: 'cm-c', slug: 'member-c', createdAt: '2026-01-01T00:00:00.000Z', displayOrder: 1 });
    await insertMember(db, { id: 'cm-d', slug: 'member-d', createdAt: '2026-03-01T00:00:00.000Z', displayOrder: 1 });

    const home = await service.getHome();

    // display_order 1 first (newest created_at first), then display_order 2.
    expect(home.collective.map((m) => m.id)).toEqual(['cm-d', 'cm-b', 'cm-c', 'cm-a']);
  });

  it('returns empty arrays for every section on an empty database', async () => {
    const home = await service.getHome();

    expect(home).toEqual({
      courses: [],
      projects: [],
      marketplace: [],
      collective: [],
    });
  });

  it('runs exactly one query per section with no extra data-layer work (N+1 proof)', async () => {
    await insertCourse(db, { id: 'c-1', slug: 'course-1', createdAt: '2026-01-01T00:00:00.000Z' });
    await insertProject(db, { id: 'p-1', slug: 'project-1', createdAt: '2026-01-01T00:00:00.000Z' });
    await insertMarketplaceItem(db, { id: 'm-1', slug: 'item-1', createdAt: '2026-01-01T00:00:00.000Z' });
    await insertMember(db, { id: 'cm-1', slug: 'member-1', createdAt: '2026-01-01T00:00:00.000Z' });

    const queryAllSpy = jest.spyOn(db, 'queryAll');
    const queryOneSpy = jest.spyOn(db, 'queryOne');
    const executeSpy = jest.spyOn(db, 'execute');

    await service.getHome();

    // Exactly 4 queries total: one per section, regardless of row counts.
    expect(queryAllSpy).toHaveBeenCalledTimes(4);
    expect(queryOneSpy).not.toHaveBeenCalled();
    expect(executeSpy).not.toHaveBeenCalled();

    // Every section query filters to published content and binds its limit.
    for (const [sql, params] of queryAllSpy.mock.calls) {
      expect(sql).toContain("status = 'published'");
      expect(sql).toContain('LIMIT ?');
      expect(params).toHaveLength(1);
    }
  });
});
