import type { ApiResponse } from './response';

declare global {
  namespace Express {
    interface Response {
      j<T>(body: ApiResponse<T>): this;
    }
  }
}

export {};
