import axios from "axios";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

// Response interceptor — unwrap ApiResponse.data automatically
apiClient.interceptors.response.use(
  (response) => {
    // If response has the standard { success, data } shape, unwrap it
    if (response.data && "success" in response.data && "data" in response.data) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    const message =
      error?.response?.data?.error ??
      error?.response?.data?.detail ??
      error?.message ??
      "An unexpected error occurred";

    // Show toast for server errors (not 4xx user errors)
    if (error?.response?.status >= 500) {
      toast.error(`Server Error: ${message}`);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
