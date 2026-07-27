import type { ApiResponse } from './response';
import type { AuthRequestContext } from './auth';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthRequestContext;
    }

    interface Response {
      j<T>(body: ApiResponse<T>): this;
    }
  }
}

export {};
