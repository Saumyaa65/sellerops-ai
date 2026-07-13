/** Generic API response wrapper matching backend ApiResponse schema. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  detail?: string;
}
