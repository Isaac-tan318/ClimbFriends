export type AppError = {
  message: string;
  code?: string;
  details?: unknown;
};

export type AppResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

export const ok = <T>(data: T): AppResult<T> => ({ ok: true, data });

export const err = <T = never>(message: string, code?: string, details?: unknown): AppResult<T> => ({
  ok: false,
  error: { message, code, details },
});
