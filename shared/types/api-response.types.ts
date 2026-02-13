export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
