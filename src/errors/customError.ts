import type { CustomErrorParams, ErrorTypes } from "../types/error";

export default class CustomError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  private errorCode: ErrorTypes;
  private reason?: string | undefined;
  private details?: any;

  constructor(error: CustomErrorParams) {
    super(error.message);
    this.statusCode = error.statusCode;
    this.errorCode = error.errorCode;
    this.reason = error.reason;
    this.details = error.details;
    this.isOperational = error.isOperational ?? true;
  }

  toJSON() {
    return {
      message: this.message,
      errorCode: this.errorCode,
      reason: this.reason ?? "No additional information provided",
      details: this.details,
    };
  }
}

export function throwNotFound(message: string): void {
  throw new CustomError({
    message,
    statusCode: 404,
    errorCode: "NOT_FOUND",
    isOperational: true,
    reason:
      "This error occurs when a requested resource cannot be found in the database.",
  });
}
