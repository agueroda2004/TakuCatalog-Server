import type { Response } from "express";

export type ApiResponse<T> = {
  res: Response;
  status: number;
  data?: T | null;
};
