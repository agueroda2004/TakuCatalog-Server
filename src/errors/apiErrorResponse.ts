import type { ApiErrorResponseParams } from "../types/error";

export default class ApiErrorResponse extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(error: ApiErrorResponseParams) {
    super(error.message);
    this.statusCode = error.statusCode;
    this.isOperational = error.isOperational;
  }

  toJSON() {
    return {
      message: this.message,
    };
  }
}
