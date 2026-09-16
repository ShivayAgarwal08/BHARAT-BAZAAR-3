export interface ApiSuccess<T = undefined> {
  success: true;
  message: string;
  data?: T;
}

export interface ApiError {
  success: false;
  message: string;
  error: { code: string; details?: { path: string; message: string }[] };
}
