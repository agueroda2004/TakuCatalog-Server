import CustomError, { throwNotFound } from "../errors/customError";
import prisma from "../lib/prisma";

/**
 * Function to validate if the requester is the owner of the store.
 */
export const validateStoreOwner = async (
  storeId: string,
  requesterId: string,
) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { userId: true },
  });

  if (!store) {
    throwNotFound("Store not found");
    return;
  }

  if (store.userId !== requesterId) {
    throw new CustomError({
      statusCode: 403,
      message: "You are not the owner of this store",
      errorCode: "FORBIDDEN",
      isOperational: true,
      reason:
        "This error occurs when a user tries to access or modify a store that they do not own.",
    });
  }
};
