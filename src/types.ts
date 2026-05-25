export interface BrewingMethod {
  id: string;
  name: string;
  description: string;
  waterTemp: number; // Celsius
  grindSize: string;
  brewTime: number; // seconds
  ratio: string; // coffee:water
}

export interface Brew {
  id: string;
  methodId: string;
  coffeeName: string;
  grindSetting: string;
  waterTemp: number;
  brewTime: number;
  rating: number; // 1-5
  notes?: string;
  timestamp: string;
}

export interface RecommendationParams {
  coffeeName?: string;
  methodId?: string;
  preferredGrind?: string;
  preferredTemp?: number;
}

export interface Recommendation {
  method: BrewingMethod;
  params: {
    grindSize: string;
    waterTemp: number;
    brewTime: number;
    ratio: string;
  };
  reasoning: string;
}
