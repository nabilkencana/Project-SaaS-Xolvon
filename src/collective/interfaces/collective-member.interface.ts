export type CollectiveMemberStatus = 'draft' | 'published';

/**
 * Row shape of `collective_members` (migration 0004_projects_collective.sql).
 * `skills` is stored as comma-separated TEXT and `social_links` as a JSON
 * array TEXT (SCHEMA.md §54-56); both are parsed at the mapper layer.
 */
export interface CollectiveMemberRow {
  id: string;
  name: string;
  slug: string;
  photo: string | null;
  role: string | null;
  skills: string | null;
  bio: string | null;
  social_links: string | null;
  status: string;
  display_order: number | null;
  created_at: string | null;
}

/** Joined project card row for the member detail page (SCHEMA.md §46). */
export interface ProjectCardRow {
  id: string;
  title: string;
  slug: string;
  type: string | null;
  summary: string | null;
  status: string;
}
