// src/api/comicCatalog.ts
import { supabase } from './supabase/supabaseClient';

export interface ComicCatalogResult {
  id: number;
  name: string;
  issue_number: string | null;
  cover_url: string | null;
  publisher: string | null;
  writer: string | null;
  artist: string | null;
}

export const comicCatalogAPI = {
  async search(query: string): Promise<ComicCatalogResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in.');

    const { data, error } = await supabase.functions.invoke('search-comic-catalog', {
      body: { query: trimmed },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return (data?.results ?? []) as ComicCatalogResult[];
  },
};
