/**
 * Standardized response transformation utilities
 * Handles backend response normalization (array/data wrapper checks)
 */

/**
 * Transforms backend response to array
 * Handles both direct array responses and wrapped responses ({ data: [...] })
 */
export function transformArrayResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }
  
  if (response && typeof response === 'object' && 'data' in response) {
    const data = (response as { data: unknown }).data;
    if (Array.isArray(data)) {
      return data as T[];
    }
  }
  
  return [];
}

/**
 * Transforms backend response to single object
 * Handles both direct object responses and wrapped responses ({ data: {...} })
 */
export function transformObjectResponse<T>(response: unknown): T {
  if (!response) {
    return {} as T;
  }
  
  if (typeof response === 'object' && 'data' in response) {
    const data = (response as { data: unknown }).data;
    return data as T;
  }
  
  return response as T;
}

/**
 * Transforms boolean response
 */
export function transformBooleanResponse(response: unknown): boolean {
  if (typeof response === 'boolean') return response;
  if (response && typeof response === 'object' && 'data' in response) {
    const data = (response as { data: unknown }).data;
    if (typeof data === 'boolean') return data;
  }
  return false;
}

/**
 * Transforms response with success/data wrapper
 */
export function transformApiResponse<T>(response: unknown): { success: boolean; data: T; message?: string } | null {
  if (!response || typeof response !== 'object') return null;
  
  const resp = response as { success?: boolean; data?: unknown; message?: string };
  if (resp.success !== undefined && resp.data !== undefined) {
    return {
      success: resp.success,
      data: resp.data as T,
      message: resp.message,
    };
  }
  return null;
}
