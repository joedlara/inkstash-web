import { useState, useMemo, useRef, useCallback } from 'react';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

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

// Rate limiting helper
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    // 10 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }

  getTimeUntilReset(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    const timeUntilReset = this.windowMs - (Date.now() - oldestRequest);
    return Math.max(0, timeUntilReset);
  }
}

// Simple cache implementation
class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private readonly ttl: number;

  constructor(ttlMs: number = 300000) {
    // 5 minutes default
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export class AIService {
  private openai: OpenAI;
  private rateLimiter: RateLimiter;
  private cache: SimpleCache<any>;
  private pendingRequests = new Map<string, Promise<any>>();

  constructor() {
    this.openai = openai;
    this.rateLimiter = new RateLimiter(8, 60000); // 8 requests per minute to be safe
    this.cache = new SimpleCache(600000); // 10 minutes cache
  }

  // Helper method to handle rate limiting and caching
  private async makeRequest<T>(
    cacheKey: string,
    requestFn: () => Promise<T>,
    fallbackFn: () => T
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for ${cacheKey}`);
      return cached;
    }

    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`Using pending request for ${cacheKey}`);
      return this.pendingRequests.get(cacheKey);
    }

    // Check rate limit
    if (!this.rateLimiter.canMakeRequest()) {
      const waitTime = this.rateLimiter.getTimeUntilReset();
      console.warn(
        `Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)} seconds`
      );
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`
      );
    }

    // Create and cache the promise
    const promise = requestFn()
      .then(result => {
        this.cache.set(cacheKey, result);
        this.pendingRequests.delete(cacheKey);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(cacheKey);
        console.error(`AI Request failed for ${cacheKey}:`, error);

        // Return fallback for rate limit errors
        if (
          error.message?.includes('429') ||
          error.message?.includes('rate limit')
        ) {
          return fallbackFn();
        }
        throw error;
      });

    this.pendingRequests.set(cacheKey, promise);
    return promise;
  }

  async analyzeProduct(
    imageUrl: string,
    basicInfo: {
      title?: string;
      category: string;
      condition?: string;
      year?: number;
    }
  ): Promise<ProductAnalysis> {
    const cacheKey = `product-${JSON.stringify(basicInfo)}-${imageUrl}`;

    return this.makeRequest(
      cacheKey,
      async () => {
        const prompt = `Analyze this ${basicInfo.category} collectible. Consider:
        - Market value estimation
        - Current trends in the collectibles market
        - Rarity assessment
        - Investment potential
        - Create an engaging, SEO-friendly description
        
        Basic info: ${JSON.stringify(basicInfo)}
        
        Respond in JSON format with: estimatedValue (min/max), marketTrend, rarity, investmentPotential (1-10), description, tags, category, condition`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini', // Use cheaper model
          messages: [
            {
              role: 'system',
              content:
                'You are an expert in comic books, manga, collectibles, and pop culture memorabilia. Provide detailed, accurate analysis based on current market conditions.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } },
              ],
            },
          ],
          max_tokens: 800, // Reduced tokens
        });

        const analysis = JSON.parse(
          response.choices[0]?.message?.content || '{}'
        );
        return analysis as ProductAnalysis;
      },
      () => this.getFallbackAnalysis(basicInfo)
    );
  }

  async getPersonalizedRecommendations(
    userProfile: {
      favoriteCharacters: string[];
      collectionFocus: string[];
      recentPurchases: string[];
      priceRange: { min: number; max: number };
    },
    availableItems: any[]
  ): Promise<PersonalizedRecommendation[]> {
    const cacheKey = `recommendations-${JSON.stringify(userProfile)}`;

    return this.makeRequest(
      cacheKey,
      async () => {
        const prompt = `Based on this user's profile, recommend 5-10 items from the available inventory that would interest them most:

        User Profile:
        - Favorite Characters: ${userProfile.favoriteCharacters.join(', ')}
        - Collection Focus: ${userProfile.collectionFocus.join(', ')}
        - Recent Purchases: ${userProfile.recentPurchases.join(', ')}
        - Price Range: $${userProfile.priceRange.min} - $${userProfile.priceRange.max}

        Available Items: ${JSON.stringify(availableItems.slice(0, 20))} // Further reduced for token management

        For each recommendation, provide:
        - itemId
        - title
        - reason (why this matches their interests)
        - confidence (1-10)
        - category
        - priceRange

        Return as JSON array.`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini', // Use cheaper model
          messages: [
            {
              role: 'system',
              content:
                'You are a personalized shopping assistant specializing in collectibles, comics, and nerd culture. Make recommendations that match user interests and budget.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1000, // Reduced tokens
        });

        const recommendations = JSON.parse(
          response.choices[0]?.message?.content || '[]'
        );
        return recommendations as PersonalizedRecommendation[];
      },
      () => []
    );
  }

  async analyzeCollection(
    collectionItems: {
      title: string;
      category: string;
      purchasePrice?: number;
      currentValue?: number;
      condition: string;
      year?: number;
    }[]
  ): Promise<CollectionInsights> {
    // Create a hash of the collection for caching
    const collectionHash = this.hashCollection(collectionItems);
    const cacheKey = `collection-insights-${collectionHash}`;

    return this.makeRequest(
      cacheKey,
      async () => {
        // Limit collection size for analysis to save tokens
        const limitedCollection = collectionItems.slice(0, 50);

        const prompt = `Analyze this collectibles collection and provide insights:

        Collection: ${JSON.stringify(limitedCollection)}

        Provide analysis on:
        1. Total estimated value
        2. Top 5 most valuable items
        3. Missing key issues or items that would strengthen the collection
        4. Investment recommendations for future purchases
        5. Diversification score (1-10, how well-rounded is the collection)
        6. Risk profile (conservative/moderate/aggressive) based on items

        Return as JSON with these fields: totalValue, topItems, missingKeyIssues, investmentRecommendations, diversificationScore, riskProfile`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini', // Use cheaper model
          messages: [
            {
              role: 'system',
              content:
                'You are a collectibles investment advisor with deep knowledge of comics, manga, and pop culture memorabilia markets.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1000, // Reduced tokens
        });

        const insights = JSON.parse(
          response.choices[0]?.message?.content || '{}'
        );
        return insights as CollectionInsights;
      },
      () => this.getFallbackCollectionInsights()
    );
  }

  async suggestPricing(
    itemDetails: {
      title: string;
      category: string;
      condition: string;
      rarity?: string;
      year?: number;
    },
    recentSales: { price: number; date: string; condition: string }[]
  ): Promise<{
    suggestedPrice: number;
    priceRange: { min: number; max: number };
    reasoning: string;
    marketTrend: string;
  }> {
    const cacheKey = `pricing-${JSON.stringify(itemDetails)}`;

    return this.makeRequest(
      cacheKey,
      async () => {
        const prompt = `Suggest optimal pricing for this collectible:

        Item: ${JSON.stringify(itemDetails)}
        Recent Sales: ${JSON.stringify(recentSales)}

        Consider:
        - Current market conditions
        - Item condition and rarity
        - Recent sales trends
        - Seasonal factors
        - Investment potential

        Provide: suggestedPrice, priceRange (min/max), reasoning, marketTrend`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a pricing expert for collectibles markets. Provide data-driven pricing recommendations.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 600,
        });

        const pricing = JSON.parse(
          response.choices[0]?.message?.content || '{}'
        );
        return pricing;
      },
      () => ({
        suggestedPrice: 0,
        priceRange: { min: 0, max: 0 },
        reasoning: 'Unable to generate pricing recommendation',
        marketTrend: 'stable',
      })
    );
  }

  async moderateContent(
    content: string,
    context: 'forum_post' | 'review' | 'comment' | 'listing_description'
  ): Promise<{
    isAppropriate: boolean;
    confidence: number;
    issues: string[];
    suggestedEdit?: string;
  }> {
    const cacheKey = `moderation-${content.substring(0, 50)}-${context}`;

    return this.makeRequest(
      cacheKey,
      async () => {
        const prompt = `Moderate this ${context} content for a nerd culture marketplace community:

        Content: "${content}"

        Check for:
        - Inappropriate language or hate speech
        - Spam or promotional content
        - False claims about collectibles
        - Personal attacks
        - Off-topic content

        BUT preserve:
        - Passionate fan discussions
        - Technical debates about collectibles
        - Constructive criticism
        - Enthusiastic language common in fan communities

        Return: isAppropriate (boolean), confidence (1-10), issues (array of problems), suggestedEdit (if needed)`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a content moderator for a passionate collectibles community. Be permissive of fan enthusiasm while catching genuine problems.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 400,
        });

        const moderation = JSON.parse(
          response.choices[0]?.message?.content || '{}'
        );
        return moderation;
      },
      () => ({
        isAppropriate: true,
        confidence: 1,
        issues: [],
      })
    );
  }

  async generateAuctionDescription(
    item: {
      title: string;
      category: string;
      condition: string;
      rarity?: string;
      history?: string;
      imageUrls: string[];
    },
    tone:
      | 'professional'
      | 'enthusiastic'
      | 'investment-focused' = 'enthusiastic'
  ): Promise<string> {
    const cacheKey = `description-${JSON.stringify(item)}-${tone}`;

    return this.makeRequest(
      cacheKey,
      async () => {
        const prompt = `Create an engaging auction description for this ${item.category}:

        Item Details: ${JSON.stringify(item)}
        Tone: ${tone}

        Make it:
        - Exciting and compelling for collectors
        - SEO-friendly with relevant keywords
        - Highlight rarity and investment potential
        - Include condition details
        - Appeal to both casual fans and serious collectors
        - 150-300 words

        Write in a ${tone} style that would excite potential bidders.`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a professional auction house copywriter specializing in collectibles and pop culture memorabilia.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 400,
        });

        return response.choices[0]?.message?.content || item.title;
      },
      () =>
        `${item.title} - ${item.condition} condition ${item.category}. A great addition to any collection!`
    );
  }

  // Helper methods
  private getFallbackAnalysis(basicInfo: any): ProductAnalysis {
    return {
      estimatedValue: { min: 10, max: 50 },
      marketTrend: 'stable',
      rarity: 'common',
      investmentPotential: 5,
      description: `${basicInfo.title || 'Collectible item'} in good condition.`,
      tags: [basicInfo.category],
      category: basicInfo.category,
    };
  }

  private getFallbackCollectionInsights(): CollectionInsights {
    return {
      totalValue: 0,
      topItems: [],
      missingKeyIssues: [],
      investmentRecommendations: ['Consider diversifying your collection'],
      diversificationScore: 5,
      riskProfile: 'moderate',
    };
  }

  private hashCollection(items: any[]): string {
    // Simple hash function for caching collection analysis
    const str = JSON.stringify(
      items.map(i => ({ title: i.title, category: i.category }))
    );
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  // Public method to clear cache if needed
  clearCache(): void {
    this.cache.clear();
  }

  // Get rate limit status
  getRateLimitStatus(): { canMakeRequest: boolean; timeUntilReset: number } {
    return {
      canMakeRequest: this.rateLimiter.canMakeRequest(),
      timeUntilReset: this.rateLimiter.getTimeUntilReset(),
    };
  }
}

// Enhanced React hook with better error handling and user feedback
export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    canMakeRequest: boolean;
    timeUntilReset: number;
  }>({
    canMakeRequest: true,
    timeUntilReset: 0,
  });

  const aiService = useMemo(() => new AIService(), []);

  // Update rate limit info periodically
  const updateRateLimitInfo = useCallback(() => {
    setRateLimitInfo(aiService.getRateLimitStatus());
  }, [aiService]);

  const analyzeProduct = async (imageUrl: string, basicInfo: any) => {
    setLoading(true);
    setError(null);
    updateRateLimitInfo();

    try {
      const analysis = await aiService.analyzeProduct(imageUrl, basicInfo);
      return analysis;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to analyze product';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
      updateRateLimitInfo();
    }
  };

  const getRecommendations = async (
    userProfile: any,
    availableItems: any[]
  ) => {
    setLoading(true);
    setError(null);
    updateRateLimitInfo();

    try {
      const recommendations = await aiService.getPersonalizedRecommendations(
        userProfile,
        availableItems
      );
      return recommendations;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get recommendations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
      updateRateLimitInfo();
    }
  };

  const analyzeCollection = async (collectionItems: any[]) => {
    setLoading(true);
    setError(null);
    updateRateLimitInfo();

    try {
      const insights = await aiService.analyzeCollection(collectionItems);
      return insights;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to analyze collection';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
      updateRateLimitInfo();
    }
  };

  return {
    analyzeProduct,
    getRecommendations,
    analyzeCollection,
    suggestPricing: aiService.suggestPricing.bind(aiService),
    moderateContent: aiService.moderateContent.bind(aiService),
    generateDescription: aiService.generateAuctionDescription.bind(aiService),
    clearCache: aiService.clearCache.bind(aiService),
    loading,
    error,
    rateLimitInfo,
    updateRateLimitInfo,
  };
};
