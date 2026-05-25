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

/** AI recommendation (POST /recommend response) */
export interface Recommendation {
  brewing_method: string;
  input: BrewInput;
  recommendation: string;
  confidence: string;
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
}
