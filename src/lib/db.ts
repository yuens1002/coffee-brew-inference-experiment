import { PrismaClient } from '@prisma/client';
import type {
  BrewingMethod, Brew, BrewWithMethod, BrewSource,
  Origin, RecommendationRecord, BrewRecommendationLink,
} from '../types.js';

const prisma = new PrismaClient();

// ── Origins ─────────────────────────────────────────────

export async function getOrigins(): Promise<Origin[]> {
  const rows = await prisma.origin.findMany({ orderBy: { name: 'asc' } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    region: r.region,
    subregion: r.subregion ?? undefined,
    aliases: r.aliases ?? undefined,
    is_verified: r.is_verified,
  }));
}

export async function searchOrigins(query: string): Promise<Origin[]> {
  const origins = await getOrigins();
  const q = query.toLowerCase().trim();
  return origins.filter((o) =>
    o.name.toLowerCase().includes(q) ||
    (o.aliases || '').toLowerCase().includes(q) ||
    (o.subregion || '').toLowerCase().includes(q),
  );
}

// ── Brewing Methods ─────────────────────────────────────

export async function getBrewingMethods(): Promise<BrewingMethod[]> {
  const rows = await prisma.brewingMethod.findMany({ orderBy: { id: 'asc' } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    default_ratio: r.default_ratio,
    default_temp_c: r.default_temp_c,
    default_brew_time_s: r.default_brew_time_s,
    grind_size: r.grind_size,
  }));
}

// ── Brews ────────────────────────────────────────────────

export async function getBrews(filters?: {
  origin?: string;
  method?: number;
  limit?: number;
}): Promise<{ count: number; brews: BrewWithMethod[] }> {
  const where = {
    ...(filters?.origin ? { origin: filters.origin } : {}),
    ...(filters?.method !== undefined ? { brewing_method_id: filters.method } : {}),
  };

  const [rows, count] = await prisma.$transaction([
    prisma.brew.findMany({
      where,
      include: { brewing_method: true },
      orderBy: { created_at: 'desc' },
      ...(filters?.limit ? { take: filters.limit } : {}),
    }),
    prisma.brew.count({ where }),
  ]);

  const brews: BrewWithMethod[] = rows.map((r) => ({
    id: r.id,
    brewing_method_id: r.brewing_method_id,
    brewing_method: r.brewing_method.name,
    origin: r.origin,
    roast_level: r.roast_level,
    grind_size: r.grind_size,
    water_temp_c: r.water_temp_c,
    ratio: r.ratio,
    brew_time_s: r.brew_time_s,
    rating: r.rating,
    notes: r.notes ?? undefined,
    created_at: r.created_at.toISOString(),
    source: (r.source as BrewSource) || 'user_submitted',
    source_url: r.source_url ?? undefined,
    field_confidence: r.field_confidence ?? undefined,
  }));

  return { count, brews };
}

export async function getBrewById(id: number): Promise<Brew | null> {
  const r = await prisma.brew.findUnique({ where: { id } });
  if (!r) return null;
  return {
    id: r.id,
    brewing_method_id: r.brewing_method_id,
    origin: r.origin,
    roast_level: r.roast_level,
    grind_size: r.grind_size,
    water_temp_c: r.water_temp_c,
    ratio: r.ratio,
    brew_time_s: r.brew_time_s,
    rating: r.rating,
    notes: r.notes ?? undefined,
    created_at: r.created_at.toISOString(),
    source: (r.source as BrewSource) || 'user_submitted',
    source_url: r.source_url ?? undefined,
    field_confidence: r.field_confidence ?? undefined,
  };
}

export async function addBrew(
  brew: Omit<Brew, 'id' | 'created_at'> & { source?: BrewSource; source_url?: string; field_confidence?: string },
): Promise<Brew> {
  const r = await prisma.brew.create({
    data: {
      brewing_method_id: brew.brewing_method_id,
      origin: brew.origin,
      roast_level: brew.roast_level,
      grind_size: brew.grind_size,
      water_temp_c: brew.water_temp_c,
      ratio: brew.ratio,
      brew_time_s: brew.brew_time_s,
      rating: brew.rating,
      notes: brew.notes ?? null,
      source: brew.source || 'user_submitted',
      source_url: brew.source_url ?? null,
      field_confidence: brew.field_confidence ?? null,
    },
  });
  return {
    id: r.id,
    brewing_method_id: r.brewing_method_id,
    origin: r.origin,
    roast_level: r.roast_level,
    grind_size: r.grind_size,
    water_temp_c: r.water_temp_c,
    ratio: r.ratio,
    brew_time_s: r.brew_time_s,
    rating: r.rating,
    notes: r.notes ?? undefined,
    created_at: r.created_at.toISOString(),
    source: (r.source as BrewSource) || 'user_submitted',
    source_url: r.source_url ?? undefined,
    field_confidence: r.field_confidence ?? undefined,
  };
}

// ── Recommendations ─────────────────────────────────────

export async function createRecommendation(
  rec: Omit<RecommendationRecord, 'id' | 'created_at' | 'fingerprint'>,
): Promise<RecommendationRecord> {
  const fingerprint = `${(rec.origin || 'unknown').toLowerCase()}-${(rec.roast_level || 'unknown').toLowerCase()}-${rec.brewing_method_id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const r = await prisma.recommendation.create({
    data: {
      brewing_method_id: rec.brewing_method_id,
      origin: rec.origin,
      roast_level: rec.roast_level,
      grind_size: rec.grind_size,
      water_temp_c: rec.water_temp_c,
      ratio: rec.ratio,
      brew_time_s: rec.brew_time_s,
      recommendation: rec.recommendation,
      confidence: rec.confidence,
      confidence_breakdown: rec.confidence_breakdown ?? null,
      sources: rec.sources ?? null,
      fingerprint,
    },
  });
  return {
    id: r.id,
    brewing_method_id: r.brewing_method_id,
    origin: r.origin,
    roast_level: r.roast_level,
    grind_size: r.grind_size,
    water_temp_c: r.water_temp_c,
    ratio: r.ratio,
    brew_time_s: r.brew_time_s,
    recommendation: r.recommendation,
    confidence: r.confidence,
    confidence_breakdown: r.confidence_breakdown ?? undefined,
    sources: r.sources ?? undefined,
    fingerprint: r.fingerprint,
    created_at: r.created_at.toISOString(),
  };
}

export async function getRecommendation(id: number): Promise<RecommendationRecord | null> {
  const r = await prisma.recommendation.findUnique({ where: { id } });
  if (!r) return null;
  return {
    id: r.id,
    brewing_method_id: r.brewing_method_id,
    origin: r.origin,
    roast_level: r.roast_level,
    grind_size: r.grind_size,
    water_temp_c: r.water_temp_c,
    ratio: r.ratio,
    brew_time_s: r.brew_time_s,
    recommendation: r.recommendation,
    confidence: r.confidence,
    confidence_breakdown: r.confidence_breakdown ?? undefined,
    sources: r.sources ?? undefined,
    fingerprint: r.fingerprint,
    created_at: r.created_at.toISOString(),
  };
}

export async function findRecentRecommendation(params: {
  origin?: string;
  brewing_method_id?: number;
  roast_level?: string;
  withinSeconds?: number;
}): Promise<RecommendationRecord | null> {
  const since = new Date(Date.now() - (params.withinSeconds || 604800) * 1000);
  const r = await prisma.recommendation.findFirst({
    where: {
      origin: params.origin || '',
      brewing_method_id: params.brewing_method_id || 0,
      roast_level: params.roast_level || '',
      created_at: { gte: since },
    },
    orderBy: { created_at: 'desc' },
  });
  if (!r) return null;
  return {
    id: r.id,
    brewing_method_id: r.brewing_method_id,
    origin: r.origin,
    roast_level: r.roast_level,
    grind_size: r.grind_size,
    water_temp_c: r.water_temp_c,
    ratio: r.ratio,
    brew_time_s: r.brew_time_s,
    recommendation: r.recommendation,
    confidence: r.confidence,
    confidence_breakdown: r.confidence_breakdown ?? undefined,
    sources: r.sources ?? undefined,
    fingerprint: r.fingerprint,
    created_at: r.created_at.toISOString(),
  };
}

// ── Brew ↔ Recommendation Links ──────────────────────────

export async function linkBrewToRecommendation(
  brewId: number,
  recommendationId: number,
  matchConfidence: number,
): Promise<BrewRecommendationLink> {
  const r = await prisma.brewRecommendationLink.upsert({
    where: { brew_id_recommendation_id: { brew_id: brewId, recommendation_id: recommendationId } },
    update: { match_confidence: matchConfidence },
    create: { brew_id: brewId, recommendation_id: recommendationId, match_confidence: matchConfidence },
  });
  return {
    brew_id: r.brew_id,
    recommendation_id: r.recommendation_id,
    match_confidence: r.match_confidence,
    linked_at: r.linked_at.toISOString(),
  };
}

export async function getBrewLinks(brewId: number): Promise<BrewRecommendationLink[]> {
  const rows = await prisma.brewRecommendationLink.findMany({ where: { brew_id: brewId } });
  return rows.map((r) => ({
    brew_id: r.brew_id,
    recommendation_id: r.recommendation_id,
    match_confidence: r.match_confidence,
    linked_at: r.linked_at.toISOString(),
  }));
}
