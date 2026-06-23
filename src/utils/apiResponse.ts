import type { Response } from "express";
import type { ApiResponse } from "../types/apiResponse";

export const apiResponse = {
  success<T>({ res, status, data }: ApiResponse<T>) {
    return res.status(status).json({
      data: data || null,
    });
  },

  noContent(res: Response, status: number = 204) {
    return res.status(status).send();
  },
};
