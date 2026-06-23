export type ErrorTypes =
  | "NOT_FOUND"
  | "VALIDATION_ZOD_ERROR"
  | "UNIQUE_FIELD_ERROR"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "DELETE_CONSTRAINT_ERROR";

export type CustomErrorParams = {
  message: string;
  statusCode: number;
  errorCode: ErrorTypes;
  isOperational?: boolean;
  reason?: string;
  details?: any;
};

export type ApiErrorResponseParams = {
  message: string;
  isOperational: boolean;
  statusCode: number;
};
