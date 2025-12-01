// src/api/axiosClient.ts - Axios client for API calls
import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { supabase } from './supabase/supabaseClient';

// Create axios instance
const axiosClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to all requests
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      // Get current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.error('Error getting session for request:', error);
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Silently succeed - no verbose logging
    return response;
  },
  async (error: AxiosError) => {
    // Log errors
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;

      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          console.warn('Unauthorized request - session may be expired');
          // Optionally trigger a re-login
          break;

        case 403:
          // Forbidden - user doesn't have permission
          console.warn('Forbidden - insufficient permissions');
          break;

        case 404:
          // Not found
          console.warn('Resource not found');
          break;

        case 429:
          // Too many requests
          console.warn('Rate limit exceeded');
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          console.error('Server error occurred');
          break;
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received from server');
    } else {
      // Something else happened
      console.error('Error setting up request:', error.message);
    }

    return Promise.reject(error);
  }
);

// Helper function to create Supabase-style REST endpoints
export const createSupabaseRestURL = (table: string, params?: Record<string, any>): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = `${supabaseUrl}/rest/v1/${table}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    return `${url}?${searchParams.toString()}`;
  }

  return url;
};

// Wrapper functions for common operations
export const api = {
  // GET request
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosClient.get<T>(url, config);
    return response.data;
  },

  // POST request
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosClient.post<T>(url, data, config);
    return response.data;
  },

  // PUT request
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosClient.put<T>(url, data, config);
    return response.data;
  },

  // PATCH request
  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosClient.patch<T>(url, data, config);
    return response.data;
  },

  // DELETE request
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosClient.delete<T>(url, config);
    return response.data;
  },

  // Supabase REST API helpers
  supabase: {
    // Select from table
    select: async <T = any>(
      table: string,
      columns: string = '*',
      filters?: Record<string, any>
    ): Promise<T[]> => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const url = `${supabaseUrl}/rest/v1/${table}`;
      const params = new URLSearchParams();
      params.append('select', columns);

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          params.append(key, `eq.${value}`);
        });
      }

      const response = await axiosClient.get<T[]>(`${url}?${params.toString()}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });

      return response.data;
    },

    // Insert into table
    insert: async <T = any>(table: string, data: any): Promise<T> => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const url = `${supabaseUrl}/rest/v1/${table}`;

      const response = await axiosClient.post<T>(url, data, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation',
        },
      });

      return response.data;
    },

    // Update table
    update: async <T = any>(
      table: string,
      data: any,
      filters: Record<string, any>
    ): Promise<T> => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const url = `${supabaseUrl}/rest/v1/${table}`;
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        params.append(key, `eq.${value}`);
      });

      const response = await axiosClient.patch<T>(`${url}?${params.toString()}`, data, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation',
        },
      });

      return response.data;
    },

    // Delete from table
    delete: async <T = any>(table: string, filters: Record<string, any>): Promise<T> => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const url = `${supabaseUrl}/rest/v1/${table}`;
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        params.append(key, `eq.${value}`);
      });

      const response = await axiosClient.delete<T>(`${url}?${params.toString()}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });

      return response.data;
    },
  },
};

export default axiosClient;
