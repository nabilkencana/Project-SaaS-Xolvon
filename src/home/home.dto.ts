/**
 * Card DTOs for the public home aggregation (plan T10, PRD §15-23).
 *
 * T5 (courses), T7 (projects), T8 (collective), and T9 (marketplace) are not
 * built yet, so the shared card shapes live here until those modules exist;
 * they deliberately carry only public fields — no draft state, no private
 * member data (email/phone never exist on collective cards), no media keys.
 */

export interface CourseCardDTO {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  thumbnailUrl: string | null;
}

export interface ProjectCardDTO {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
}

export interface MarketplaceItemDTO {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  externalUrl: string;
}

export interface CollectiveMemberDTO {
  id: string;
  name: string;
  slug: string;
  photo: string | null;
  role: string | null;
  skills: string[];
  socialLinks: string[];
}

export interface HomeResponseDTO {
  courses: CourseCardDTO[];
  projects: ProjectCardDTO[];
  marketplace: MarketplaceItemDTO[];
  collective: CollectiveMemberDTO[];
}
