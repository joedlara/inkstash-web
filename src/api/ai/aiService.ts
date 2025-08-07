import { useState, useMemo } from 'react';
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

export class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = openai;
  }

  // Analyze a product image and details to generate smart descriptions and insights
  async analyzeProduct(
    imageUrl: string,
    basicInfo: {
      title?: string;
      category: string;
      condition?: string;
      year?: number;
    }
  ): Promise<ProductAnalysis> {
    try {
      const prompt = `Analyze this ${basicInfo.category} collectible. Consider:
      - Market value estimation
      - Current trends in the collectibles market
      - Rarity assessment
      - Investment potential
      - Create an engaging, SEO-friendly description
      
      Basic info: ${JSON.stringify(basicInfo)}
      
      Respond in JSON format with: estimatedValue (min/max), marketTrend, rarity, investmentPotential (1-10), description, tags, category, condition`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
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
        max_tokens: 1000,
      });

      const analysis = JSON.parse(
        response.choices[0]?.message?.content || '{}'
      );
      return analysis as ProductAnalysis;
    } catch (error) {
      console.error('AI Product Analysis Error:', error);
      return this.getFallbackAnalysis(basicInfo);
    }
  }

  // Generate personalized recommendations based on user's collection and interests
  async getPersonalizedRecommendations(
    userProfile: {
      favoriteCharacters: string[];
      collectionFocus: string[];
      recentPurchases: string[];
      priceRange: { min: number; max: number };
    },
    availableItems: any[]
  ): Promise<PersonalizedRecommendation[]> {
    try {
      const prompt = `Based on this user's profile, recommend 5-10 items from the available inventory that would interest them most:

      User Profile:
      - Favorite Characters: ${userProfile.favoriteCharacters.join(', ')}
      - Collection Focus: ${userProfile.collectionFocus.join(', ')}
      - Recent Purchases: ${userProfile.recentPurchases.join(', ')}
      - Price Range: $${userProfile.priceRange.min} - $${userProfile.priceRange.max}

      Available Items: ${JSON.stringify(availableItems.slice(0, 50))} // Limit for token management

      For each recommendation, provide:
      - itemId
      - title
      - reason (why this matches their interests)
      - confidence (1-10)
      - category
      - priceRange

      Return as JSON array.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a personalized shopping assistant specializing in collectibles, comics, and nerd culture. Make recommendations that match user interests and budget.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1500,
      });

      const recommendations = JSON.parse(
        response.choices[0]?.message?.content || '[]'
      );
      return recommendations as PersonalizedRecommendation[];
    } catch (error) {
      console.error('AI Recommendations Error:', error);
      return [];
    }
  }

  // Analyze user's entire collection for insights and recommendations
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
    try {
      const prompt = `Analyze this collectibles collection and provide insights:

      Collection: ${JSON.stringify(collectionItems)}

      Provide analysis on:
      1. Total estimated value
      2. Top 5 most valuable items
      3. Missing key issues or items that would strengthen the collection
      4. Investment recommendations for future purchases
      5. Diversification score (1-10, how well-rounded is the collection)
      6. Risk profile (conservative/moderate/aggressive) based on items

      Return as JSON with these fields: totalValue, topItems, missingKeyIssues, investmentRecommendations, diversificationScore, riskProfile`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a collectibles investment advisor with deep knowledge of comics, manga, and pop culture memorabilia markets.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1200,
      });

      const insights = JSON.parse(
        response.choices[0]?.message?.content || '{}'
      );
      return insights as CollectionInsights;
    } catch (error) {
      console.error('AI Collection Analysis Error:', error);
      return this.getFallbackCollectionInsights();
    }
  }

  // Generate smart pricing suggestions for sellers
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
    try {
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
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a pricing expert for collectibles markets. Provide data-driven pricing recommendations.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
      });

      const pricing = JSON.parse(response.choices[0]?.message?.content || '{}');
      return pricing;
    } catch (error) {
      console.error('AI Pricing Error:', error);
      return {
        suggestedPrice: 0,
        priceRange: { min: 0, max: 0 },
        reasoning: 'Unable to generate pricing recommendation',
        marketTrend: 'stable',
      };
    }
  }

  // Smart content moderation for community posts
  async moderateContent(
    content: string,
    context: 'forum_post' | 'review' | 'comment' | 'listing_description'
  ): Promise<{
    isAppropriate: boolean;
    confidence: number;
    issues: string[];
    suggestedEdit?: string;
  }> {
    try {
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
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a content moderator for a passionate collectibles community. Be permissive of fan enthusiasm while catching genuine problems.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 600,
      });

      const moderation = JSON.parse(
        response.choices[0]?.message?.content || '{}'
      );
      return moderation;
    } catch (error) {
      console.error('AI Moderation Error:', error);
      return {
        isAppropriate: true,
        confidence: 1,
        issues: [],
      };
    }
  }

  // Generate engaging auction descriptions
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
    try {
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
        model: 'gpt-4o',
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
    } catch (error) {
      console.error('AI Description Generation Error:', error);
      return `${item.title} - ${item.condition} condition ${item.category}. A great addition to any collection!`;
    }
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
}

// React hook for AI features
export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiService = useMemo(() => new AIService(), []);

  const analyzeProduct = async (imageUrl: string, basicInfo: any) => {
    setLoading(true);
    setError(null);

    try {
      const analysis = await aiService.analyzeProduct(imageUrl, basicInfo);
      return analysis;
    } catch (err) {
      setError('Failed to analyze product');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getRecommendations = async (
    userProfile: any,
    availableItems: any[]
  ) => {
    setLoading(true);
    setError(null);

    try {
      const recommendations = await aiService.getPersonalizedRecommendations(
        userProfile,
        availableItems
      );
      return recommendations;
    } catch (err) {
      setError('Failed to get recommendations');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const analyzeCollection = async (collectionItems: any[]) => {
    setLoading(true);
    setError(null);

    try {
      const insights = await aiService.analyzeCollection(collectionItems);
      return insights;
    } catch (err) {
      setError('Failed to analyze collection');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    analyzeProduct,
    getRecommendations,
    analyzeCollection,
    suggestPricing: aiService.suggestPricing.bind(aiService),
    moderateContent: aiService.moderateContent.bind(aiService),
    generateDescription: aiService.generateAuctionDescription.bind(aiService),
    loading,
    error,
  };
};
