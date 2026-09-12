import { SearchService } from './search.service';

describe('SearchService', () => {
  it('returns published results across all public entity types with pagination', async () => {
    const db = {
      queryOne: jest.fn().mockResolvedValue({ total: 3 }),
      queryAll: jest.fn().mockResolvedValue([
        {
          entity_type: 'course',
          id: 'course-1',
          title: 'Published Course',
          slug: 'published-course',
          description: 'A public course',
          status: 'published',
          created_at: '2026-09-12T00:00:03.000Z',
        },
        {
          entity_type: 'project',
          id: 'project-1',
          title: 'Published Project',
          slug: 'published-project',
          description: 'A public project',
          status: 'published',
          created_at: '2026-09-12T00:00:02.000Z',
        },
        {
          entity_type: 'marketplace',
          id: 'item-1',
          title: 'Published Item',
          slug: 'published-item',
          description: 'A public item',
          status: 'published',
          created_at: '2026-09-12T00:00:01.000Z',
        },
      ]),
    };

    const result = await new SearchService(db as never).search({
      q: 'public',
      page: 2,
      limit: 3,
    });

    expect(result).toEqual({
      items: [
        {
          type: 'course',
          id: 'course-1',
          title: 'Published Course',
          slug: 'published-course',
          description: 'A public course',
          status: 'published',
        },
        {
          type: 'project',
          id: 'project-1',
          title: 'Published Project',
          slug: 'published-project',
          description: 'A public project',
          status: 'published',
        },
        {
          type: 'marketplace',
          id: 'item-1',
          title: 'Published Item',
          slug: 'published-item',
          description: 'A public item',
          status: 'published',
        },
      ],
      query: 'public',
      page: 2,
      limit: 3,
      total: 3,
    });

    const [sql, params] = db.queryAll.mock.calls[0];
    expect(sql).toContain('UNION ALL');
    expect(sql).toContain("status = 'published'");
    expect(sql).toContain('MATCH ?');
    expect(sql).not.toContain("'%" );
    expect(params).toEqual(['public*', 'public*', 'public*', 3, 3]);
  });

  it('does not expose unpublished or revoked rows and sanitizes malformed FTS input', async () => {
    const db = {
      queryOne: jest.fn().mockResolvedValue({ total: 0 }),
      queryAll: jest.fn().mockResolvedValue([]),
    };

    const result = await new SearchService(db as never).search({
      q: 'draft OR private; revoked',
      page: 1,
      limit: 20,
    });

    expect(result.items).toEqual([]);
    const [sql, params] = db.queryAll.mock.calls[0];
    expect(sql).toContain("status = 'published'");
    expect(sql).not.toContain('revoked');
    expect(params[0]).toBe('draft* AND OR* AND private* AND revoked*');
  });
});
