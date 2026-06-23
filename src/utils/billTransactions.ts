import CustomError from "../errors/customError";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["DELIVERED"],
  CANCELLED: [],
  DELIVERED: [],
};

export const validateTransition = (current: string, next: string) => {
  const allowed = VALID_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw new CustomError({
      statusCode: 409,
      message: `Cannot transition bill from ${current} to ${next}`,
      errorCode: "CONFLICT",
    });
  }
};
