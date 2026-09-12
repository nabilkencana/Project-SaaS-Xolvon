import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { SearchQueryDto } from './dto/search-query.dto';

export interface SearchResultDto {
  type: 'course' | 'project' | 'marketplace';
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: 'published';
}

export interface SearchResponseDto {
  items: SearchResultDto[];
  query: string;
  page: number;
  limit: number;
  total: number;
}

interface SearchRow extends SearchResultDto {
  entity_type: SearchResultDto['type'];
  created_at: string;
}

const SEARCH_TYPES = {
  course: {
    table: 'courses',
    fts: 'course_fts',
    description: 'description',
  },
  project: {
    table: 'projects',
    fts: 'project_fts',
    description: 'summary',
  },
  marketplace: {
    table: 'marketplace_items',
    fts: 'marketplace_fts',
    description: 'description',
  },
} as const;

@Injectable()
export class SearchService {
  constructor(private readonly db: DatabaseService) {}

  async search(query: SearchQueryDto): Promise<SearchResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const types = query.type ? [query.type] : Object.keys(SEARCH_TYPES) as Array<keyof typeof SEARCH_TYPES>;
    const ftsQuery = this.toFtsQuery(query.q ?? '');
    const branches = types.map((type) => this.branch(type, Boolean(ftsQuery))).join(' UNION ALL ');
    const params = types.flatMap(() => (ftsQuery ? [ftsQuery] : []));
    const count = await this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM (${branches}) AS search_results;`,
      params,
    );
    const rows = await this.db.queryAll<SearchRow>(
      `SELECT entity_type, id, title, slug, description, status, created_at FROM (${branches}) AS search_results ORDER BY created_at DESC, id ASC LIMIT ? OFFSET ?;`,
      [...params, limit, offset],
    );

    return {
      items: rows.map(({ entity_type, id, title, slug, description, status }) => ({
        type: entity_type,
        id,
        title,
        slug,
        description,
        status,
      })),
      query: query.q ?? '',
      page,
      limit,
      total: Number(count?.total ?? 0),
    };
  }

  private branch(type: keyof typeof SEARCH_TYPES, hasQuery: boolean): string {
    const definition = SEARCH_TYPES[type];
    const match = hasQuery ? ` INNER JOIN ${definition.fts} ON ${definition.fts}.rowid = ${definition.table}.rowid AND ${definition.fts} MATCH ?` : '';
    return `SELECT '${type}' AS entity_type, ${definition.table}.id, ${definition.table}.title, ${definition.table}.slug, ${definition.table}.${definition.description} AS description, ${definition.table}.status, ${definition.table}.created_at FROM ${definition.table}${match} WHERE ${definition.table}.status = 'published'`;
  }

  private toFtsQuery(value: string): string {
    return value
      .trim()
      .replace(/[^\p{L}\p{N}_]+/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => `${token}*`)
      .join(' AND ');
  }
}
