import type { Response, Request, NextFunction } from "express";
import { ZodError, ZodType } from "zod";
import CustomError from "../errors/customError";
import ApiErrorResponse from "../errors/apiErrorResponse";

export const validateSchema = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const nextError = new ApiErrorResponse({
          statusCode: 400,
          message: "Data validation error",
          isOperational: true,
        });
        return next(nextError);
      }
      next(error);
    }
  };
};
