export interface BrewRecord {
  id?: number;
  origin: string;
  roast_level: string;
  grind_size: string;
  water_temp_c: number;
  ratio: number;
  brew_time_s: number;
  rating: number;
  notes?: string;
  created_at?: string;
}

export interface BrewRecommendation {
  origin: string;
  roast_level: string;
  grind_size: string;
  water_temp_c: number;
  ratio: number;
  brew_time_s: number;
  recommendation: string;
}

export interface DSPyRequest {
  origin: string;
  roast_level: string;
  grind_size: string;
  water_temp_c: number;
  ratio: number;
  brew_time_s: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}