import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CollectiveMemberDTO,
  CourseCardDTO,
  HomeResponseDTO,
  MarketplaceItemDTO,
  ProjectCardDTO,
} from './home.dto';

/** Card sizes pinned by PRD §19-22 (4 previews, ~20-member collective carousel). */
const COURSE_LIMIT = 4;
const PROJECT_LIMIT = 4;
const MARKETPLACE_LIMIT = 4;
const COLLECTIVE_LIMIT = 20;

interface CourseRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
}

interface ProjectRow {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
}

interface MarketplaceRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  external_url: string;
}

interface CollectiveMemberRow {
  id: string;
  name: string;
  slug: string;
  photo: string | null;
  role: string | null;
  skills: string | null;
  social_links: string | null;
}

/**
 * Public home aggregation (plan T10, PRD §15-23).
 *
 * Reads published-only content across courses, projects, marketplace items,
 * and collective members in exactly ONE query per section, executed in
 * parallel via Promise.all — no N+1, no enrollment/order/audit access, and
 * no admin operations: home is purely read-only and public.
 */
@Injectable()
export class HomeService {
  constructor(private readonly db: DatabaseService) {}

  async getHome(): Promise<HomeResponseDTO> {
    const [courses, projects, marketplace, collective] = await Promise.all([
      this.fetchCourses(),
      this.fetchProjects(),
      this.fetchMarketplace(),
      this.fetchCollective(),
    ]);
    return { courses, projects, marketplace, collective };
  }

  private async fetchCourses(): Promise<CourseCardDTO[]> {
    const rows = await this.db.queryAll<CourseRow>(
      "SELECT id, title, slug, description, price, thumbnail_url FROM courses " +
        "WHERE status = 'published' ORDER BY created_at DESC LIMIT ?",
      [COURSE_LIMIT],
    );
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      price: row.price,
      thumbnailUrl: row.thumbnail_url,
    }));
  }

  private async fetchProjects(): Promise<ProjectCardDTO[]> {
    const rows = await this.db.queryAll<ProjectRow>(
      'SELECT id, title, slug, summary FROM projects ' +
        "WHERE status = 'published' ORDER BY created_at DESC LIMIT ?",
      [PROJECT_LIMIT],
    );
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
    }));
  }

  private async fetchMarketplace(): Promise<MarketplaceItemDTO[]> {
    const rows = await this.db.queryAll<MarketplaceRow>(
      'SELECT id, title, slug, description, external_url FROM marketplace_items ' +
        "WHERE status = 'published' ORDER BY created_at DESC LIMIT ?",
      [MARKETPLACE_LIMIT],
    );
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      externalUrl: row.external_url,
    }));
  }

  private async fetchCollective(): Promise<CollectiveMemberDTO[]> {
    const rows = await this.db.queryAll<CollectiveMemberRow>(
      'SELECT id, name, slug, photo, role, skills, social_links FROM collective_members ' +
        "WHERE status = 'published' ORDER BY display_order ASC, created_at DESC LIMIT ?",
      [COLLECTIVE_LIMIT],
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      photo: row.photo,
      role: row.role,
      skills: this.parseJsonArray(row.skills),
      socialLinks: this.parseJsonArray(row.social_links),
    }));
  }

  /**
   * `skills` and `social_links` are stored as JSON arrays; malformed or
   * non-array values degrade to an empty list instead of leaking raw JSON.
   */
  private parseJsonArray(value: string | null): string[] {
    if (!value) {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((item): item is string => typeof item === 'string');
    } catch {
      return [];
    }
  }
}
