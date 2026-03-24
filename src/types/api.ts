export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number
  page: number
  per_page: number
}
