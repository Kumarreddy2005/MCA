/** Standard API response structure */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export function buildSuccess<T>(
  data?: T,
  message?: string,
  meta?: ApiResponse["meta"]
): ApiResponse<T> {
  return {
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  };
}

export function buildError(code: string, message: string, details?: unknown): ApiResponse {
  const error: ApiResponse["error"] = { code, message };
  if (details !== undefined) {
    error!.details = details;
  }
  return { success: false, error };
}

export function buildPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
