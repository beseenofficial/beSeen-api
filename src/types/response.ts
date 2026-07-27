interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  result: T;
}

export type { ApiResponse };
