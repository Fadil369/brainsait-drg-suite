import { ApiResponse } from "../../shared/types";
import { toast } from 'sonner';
// In a real app, this would be configured via environment variables
const API_BASE_URL = '/api'; // Default to relative path for same-origin API
/**
 * A typed API client for making requests to the backend.
 *
 * @template T The expected type of the `data` property in a successful response.
 * @param {string} path The API endpoint path (e.g., '/users').
 * @param {RequestInit} [init] Optional request options (method, body, etc.).
 * @returns {Promise<T>} A promise that resolves with the response data.
 * @throws {Error} Throws an error if the request fails or the response is not successful.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      ...init,
    });
    const json = (await res.json()) as ApiResponse<T>;
    if (!res.ok || !json.success || json.data === undefined) {
      const errorMessage = json.error || `Request failed with status ${res.status}`;
      console.error(`API Error on ${path}:`, errorMessage);
      toast.error('API Error', { description: errorMessage });
      throw new Error(errorMessage);
    }
    return json.data;
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error(`Network or parsing error on ${path}:`, error);
      toast.error('Network Error', { description: 'Could not connect to the server. Please check your connection.' });
    }
    // Re-throw the error so it can be caught by the caller (e.g., React Query)
    throw error;
  }
}