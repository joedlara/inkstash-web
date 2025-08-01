// src/comicvine/comicvineapi.ts
import axios from "axios"

const API_KEY = import.meta.env.VITE_COMICVINE_KEY as string
const BASE_URL = "https://comicvine.gamespot.com/api"

export interface ComicVineIssue {
  id: number
  name: string
  image: { icon_url: string }
}

export async function fetchIssues(limit = 8): Promise<ComicVineIssue[]> {
  const { data } = await axios.get(`${BASE_URL}/issues/`, {
    params: {
      api_key: API_KEY,
      format: "json",
      limit,
      field_list: "id,name,image",
    },
  })
  if (data.error && data.error !== "OK") {
    throw new Error(`ComicVine API error: ${data.error}`)
  }
  return data.results as ComicVineIssue[]
}
