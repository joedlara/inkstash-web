import { useState, useMemo } from 'react';
import { AIService } from '../services/ai';

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

  return {
    analyzeProduct,
    getRecommendations,
    analyzeCollection: aiService.analyzeCollection.bind(aiService),
    suggestPricing: aiService.suggestPricing.bind(aiService),
    moderateContent: aiService.moderateContent.bind(aiService),
    generateDescription: aiService.generateAuctionDescription.bind(aiService),
    loading,
    error,
  };
};
