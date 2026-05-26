/** Brewing method definition (GET /brewing-methods) */
export interface BrewingMethod {
  id: number;
  name: string;
  description: string;
  default_ratio: number;
  default_temp_c: number;
  default_brew_time_s: number;
  grind_size: string;
}

/** Coffee origin reference (seed data + user-discovered) */
export interface Origin {
  id: number;
  name: string;
  region: string;
  subregion?: string;
  aliases?: string;       // comma-separated misspellings: "Ethiopean,Ethopian"
  is_verified: boolean;
}

/** Source attribution for a brew entry */
export type BrewSource = 'user_submitted' | 'scraped:reddit' | 'scraped:home-barista';

/** Per-field extraction confidence from narrative parsing */
export interface FieldConfidence {
  origin?: number;
  roast_level?: number;
  brewing_method_name?: number;
  grind_size?: number;
  water_temp_c?: number;
  ratio?: number;
  brew_time_s?: number;
  rating?: number;
  notes?: number;
}

/** Brew log record (POST /brews request body, stored row) */
export interface Brew {
  id: number;
  brewing_method_id: number;
  origin: string;
  roast_level: string;
  grind_size: string;
  water_temp_c: number;
  ratio: number;
  brew_time_s: number;
  rating: number;
  notes?: string;
  created_at: string;
  source: BrewSource;
  source_url?: string;
  field_confidence?: string; // JSON-serialized FieldConfidence
}

/** Parameters submitted to POST /recommend */
export interface RecommendationParams {
  brewing_method_id?: number;
  origin?: string;
  roast_level?: string;
  grind_size?: string;
  water_temp_c?: number;
  ratio?: number;
  brew_time_s?: number;
}

/** Brew input fields echoed back in the recommendation response */
export interface BrewInput {
  origin: string;
  roast_level: string;
  grind_size: string;
  water_temp_c: number;
  ratio: number;
  brew_time_s: number;
}

/** Source reference — a brew that informed this recommendation */
export interface SourceRef {
  brew_id: number;
  relevance: number; // 0-1 match score
}

/** AI recommendation (POST /recommend response) */
export interface Recommendation {
  id: number;
  brewing_method: string;
  input: BrewInput;
  recommendation: string;
  confidence: 'high' | 'medium' | 'low';
  sources: SourceRef[];
  data_points_used: number;
}

/** Stored recommendation record (prediction log) */
export interface RecommendationRecord {
  id: number;
  brewing_method_id: number;
  origin: string;
  roast_level: string;
  grind_size: string;
  water_temp_c: number;
  ratio: number;
  brew_time_s: number;
  recommendation: string;
  confidence: string;
  confidence_breakdown?: string; // JSON: {data_points, match_count, match_quality}
  sources?: string;              // JSON: SourceRef[]
  fingerprint: string;           // "ethiopia-light-1-1711234567"
  created_at: string;
}

/** Implicit link between a brew and a recommendation */
export interface BrewRecommendationLink {
  brew_id: number;
  recommendation_id: number;
  match_confidence: number;
  linked_at: string;
}

/** Brew record with resolved method name (GET /brews response) */
export interface BrewWithMethod {
  id: number;
  brewing_method: string;
  origin: string;
  roast_level: string;
  grind_size: string;
  water_temp_c: number;
  ratio: number;
  brew_time_s: number;
  rating: number;
  notes?: string;
  created_at: string;
  source: BrewSource;
  source_url?: string;
  field_confidence?: string; // JSON-serialized FieldConfidence; used by computeBestBrew scoring
}
