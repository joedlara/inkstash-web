// src/api/openai.ts - OpenAI/ChatGPT API integration using axios
import axios from 'axios';
import type { AxiosInstance } from 'axios';

// Create dedicated axios instance for OpenAI API
const openaiClient: AxiosInstance = axios.create({
  baseURL: 'https://api.openai.com/v1',
  timeout: 60000, // 60 seconds for AI responses
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add API key
openaiClient.interceptors.request.use(
  (config) => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

    if (!apiKey) {
      console.error('OpenAI API key not found in environment variables');
      throw new Error('OpenAI API key not configured');
    }

    config.headers.Authorization = `Bearer ${apiKey}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
openaiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('❌ OpenAI API Error:', {
      status: error.response?.status,
      message: error.response?.data?.error?.message || error.message,
      type: error.response?.data?.error?.type,
    });
    return Promise.reject(error);
  }
);

// Types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// OpenAI API functions
export const openaiAPI = {
  /**
   * Send a chat completion request to OpenAI
   */
  async chatCompletion(
    messages: ChatMessage[],
    options: Partial<ChatCompletionRequest> = {}
  ): Promise<ChatCompletionResponse> {
    const response = await openaiClient.post<ChatCompletionResponse>('/chat/completions', {
      model: options.model || 'gpt-4',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1000,
      top_p: options.top_p ?? 1,
      frequency_penalty: options.frequency_penalty ?? 0,
      presence_penalty: options.presence_penalty ?? 0,
      stream: false,
    });

    return response.data;
  },

  /**
   * Generate a simple text response from a prompt
   */
  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await this.chatCompletion(messages);
    return response.choices[0]?.message?.content || '';
  },

  /**
   * Generate item descriptions for collectibles
   */
  async generateItemDescription(itemDetails: {
    title: string;
    category?: string;
    condition?: string;
    features?: string[];
  }): Promise<string> {
    const systemPrompt = `You are an expert at writing engaging product descriptions for collectible items.
Create compelling, accurate descriptions that highlight the item's unique features and appeal to collectors.
Keep descriptions concise (2-3 paragraphs) and professional.`;

    const userPrompt = `Generate a product description for this collectible:
Title: ${itemDetails.title}
${itemDetails.category ? `Category: ${itemDetails.category}` : ''}
${itemDetails.condition ? `Condition: ${itemDetails.condition}` : ''}
${itemDetails.features?.length ? `Features: ${itemDetails.features.join(', ')}` : ''}`;

    return await this.generateText(userPrompt, systemPrompt);
  },

  /**
   * Generate pricing suggestions based on item details
   */
  async suggestPricing(itemDetails: {
    title: string;
    category: string;
    condition: string;
    marketData?: string;
  }): Promise<{ startingBid: number; buyNowPrice: number; reasoning: string }> {
    const systemPrompt = `You are a collectibles pricing expert. Provide realistic pricing suggestions based on market data and item condition.
Return your response in JSON format with startingBid, buyNowPrice, and reasoning fields.`;

    const userPrompt = `Suggest auction pricing for this item:
Title: ${itemDetails.title}
Category: ${itemDetails.category}
Condition: ${itemDetails.condition}
${itemDetails.marketData ? `Market Data: ${itemDetails.marketData}` : ''}`;

    const response = await this.generateText(userPrompt, systemPrompt);

    try {
      return JSON.parse(response);
    } catch {
      // Fallback if JSON parsing fails
      return {
        startingBid: 10,
        buyNowPrice: 50,
        reasoning: 'Unable to generate specific pricing suggestion',
      };
    }
  },

  /**
   * Moderate user-generated content
   */
  async moderateContent(text: string): Promise<{
    flagged: boolean;
    categories: string[];
    scores: Record<string, number>;
  }> {
    const response = await openaiClient.post('/moderations', {
      input: text,
    });

    const result = response.data.results[0];
    return {
      flagged: result.flagged,
      categories: Object.keys(result.categories).filter(
        (key) => result.categories[key]
      ),
      scores: result.category_scores,
    };
  },

  /**
   * Generate search keywords/tags for an item
   */
  async generateTags(itemTitle: string, itemDescription: string): Promise<string[]> {
    const systemPrompt = `You are an SEO expert specializing in collectibles.
Generate 5-10 relevant search keywords/tags for the given item.
Return only the tags as a comma-separated list.`;

    const userPrompt = `Generate search tags for:
Title: ${itemTitle}
Description: ${itemDescription}`;

    const response = await this.generateText(userPrompt, systemPrompt);
    return response.split(',').map((tag) => tag.trim()).filter(Boolean);
  },

  /**
   * Generate personalized recommendations explanation
   */
  async explainRecommendation(
    userPreferences: string[],
    itemTitle: string
  ): Promise<string> {
    const systemPrompt = `You are a personalization expert. Explain why an item is recommended to a user based on their preferences.
Keep the explanation brief (1-2 sentences) and friendly.`;

    const userPrompt = `User preferences: ${userPreferences.join(', ')}
Recommended item: ${itemTitle}
Explain why this is a good match.`;

    return await this.generateText(userPrompt, systemPrompt);
  },
};

export default openaiAPI;
