import { getAuth } from "@clerk/express";
import type { NextFunction, Response, Request } from "express";
import CustomError from "../errors/customError";
import * as Sentry from "@sentry/node";

/**
 * Middleware to require authentication for protected routes. It checks if the user is authenticated by verifying the presence of a user ID in the request.
 * @throws A custom error if the user isn't authenticated.
 */
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const { userId } = getAuth(req);

  if (!userId) {
    Sentry.logger.warn("Unauthorized access attempt to a protected route", {
      warning: "Unauthorized access",
      route: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });

    throw new CustomError({
      statusCode: 401,
      message: "You are not authorized to access this resource",
      errorCode: "UNAUTHORIZED",
    });
  }

  req.userId = userId;
  next();
};
