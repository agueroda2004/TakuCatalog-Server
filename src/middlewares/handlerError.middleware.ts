import type { NextFunction, Response, Request } from "express";
import customError from "../errors/customError";
import { ZodError } from "zod";
import * as Sentry from "@sentry/node";
import ApiErrorResponse from "../errors/apiErrorResponse";

export default function handlerError(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ApiErrorResponse) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }
  if (err instanceof ZodError) {
    console.log("Request body that caused the error:", err.issues);
    return res.status(400).json({
      success: false,
      message: "Validation failed with Zod",
      error: err.issues,
    });
  }
  if (err instanceof customError && err.isOperational) {
    console.log("Operational error occurred:", {
      message: err.message,
      details: err.cause,
      errorCode: err.errorCode,
      stack: err.stack,
    });
    return res.status(err.statusCode).json({
      success: false,
      errorCode: err.errorCode,
      message: err.message,
      time: err.timestamp,
    });
  } else {
    console.error("Unexpected error occurred:", {
      message: err.message,
      stack: err.stack,
    });
    // Sentry.captureException(err, {
    //   extra: {
    //     path: req.path,
    //     method: req.method,
    //   },
    // });
    console.error("Error captured by Sentry:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      time: new Date().toISOString(),
    });
  }
}
