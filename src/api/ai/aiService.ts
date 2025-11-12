export interface ProductAnalysis {
  estimatedValue: { min: number; max: number };
  marketTrend: 'rising' | 'stable' | 'declining';
  rarity: 'common' | 'uncommon' | 'rare' | 'very rare';
  investmentPotential: number; // 1-10 scale
  description: string;
  tags: string[];
  category: string;
  condition?: string;
}

export interface CollectionInsights {
  totalValue: number;
  topItems: string[];
  missingKeyIssues: string[];
  investmentRecommendations: string[];
  diversificationScore: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
}

export interface PersonalizedRecommendation {
  itemId: string;
  title: string;
  reason: string;
  confidence: number;
  category: string;
  priceRange: { min: number; max: number };
}


