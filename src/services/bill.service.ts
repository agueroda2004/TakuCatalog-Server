import CustomError from "../errors/customError";
import prisma from "../lib/prisma";
import type {
  ChangeStatusBillDTO,
  CreateBillDTO,
} from "../schemas/bill.schema";
import { validateTransition } from "../utils/billTransactions";
import { validateStoreAuth } from "../utils/storeAuth";

export const billService = {
  /**
   * Function to create a new bill.
   * @param data - Bill data following the CreateBillDTO (..src/schemas/bill.schema.ts).
   * @param requesterId - The ID of the user making the request.
   * @returns The created bill including its details.
   */
  async createBill(data: CreateBillDTO, requesterId: string) {
    await validateStoreAuth(data.storeId, requesterId);

    const productIds = data.products.map((p) => p.productId);
    const variantIds = data.products
      .filter((p) => p.productVariantId)
      .map((p) => p.productVariantId!);

    const [existingProducts, existingVariants] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds }, storeId: data.storeId, active: true },
        select: { id: true, name: true },
      }),
      variantIds.length
        ? prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: {
              id: true,
              name: true,
              productId: true,
              stock: true,
              price: true,
            },
          })
        : Promise.resolve([]),
    ]);

    if (existingProducts.length !== productIds.length) {
      throw new CustomError({
        statusCode: 404,
        message: "Some products were not found",
        errorCode: "NOT_FOUND",
      });
    }

    if (variantIds.length && existingVariants.length !== variantIds.length) {
      throw new CustomError({
        statusCode: 404,
        message: "Some product variants were not found",
        errorCode: "NOT_FOUND",
      });
    }

    const variantPriceMap = new Map(
      existingVariants.map((v) => [v.id, v.price]),
    );
    const variantStockMap = new Map(
      existingVariants.map((v) => [v.id, v.stock]),
    );
    const productMap = new Map(existingProducts.map((p) => [p.id, p.name]));
    const variantMap = new Map(existingVariants.map((v) => [v.id, v.name]));

    const computedTotal = data.products.reduce((sum, p) => {
      return sum + Number(variantPriceMap.get(p.productVariantId)) * p.quantity;
    }, 0);

    for (const p of data.products) {
      const stock = variantStockMap.get(p.productVariantId) ?? 0;
      if (stock < p.quantity) {
        throw new CustomError({
          statusCode: 400,
          message: `Insufficient stock for variant ${variantMap.get(p.productVariantId)}`,
          errorCode: "INSUFFICIENT_STOCK",
        });
      }
    }

    return prisma.$transaction(async (tx) => {
      await Promise.all(
        data.products.map((p) =>
          tx.productVariant.update({
            where: { id: p.productVariantId },
            data: { stock: { decrement: p.quantity } },
          }),
        ),
      );

      return tx.bill.create({
        data: {
          total: computedTotal,
          notes: data.notes ?? null,
          storeId: data.storeId,
          customerName: data.customerName ?? null,
          customerEmail: data.customerEmail ?? null,
          customerPhone: data.customerPhone ?? null,
          customerAddress: data.customerAddress ?? null,
          ...(data.paidAt && { paidAt: new Date(data.paidAt) }),
          billDetails: {
            create: data.products.map((p) => ({
              product: { connect: { id: p.productId } },
              ...(p.productVariantId && {
                productVariant: { connect: { id: p.productVariantId } },
              }),
              quantity: p.quantity,
              price: Number(variantPriceMap.get(p.productVariantId!)),
              productName: productMap.get(p.productId)!,
              variantName: p.productVariantId
                ? (variantMap.get(p.productVariantId) ?? null)
                : null,
            })),
          },
        },
        include: { billDetails: true },
      });
    });
  },
  /**
   * Changes the status of a bill. Validates store ownership and that the
   * transition is valid using the billTransitions util.
   * @param data - Object containing the bill id and new status.
   * @param requesterId - The ID of the user making the request.
   * @throws A CustomError if the bill is not found, the requester is not authorized,
   * @returns The updated bill.
   */
  async changeStatus({ id, status }: ChangeStatusBillDTO, requesterId: string) {
    const bill = await prisma.bill.findUnique({
      where: { id },
      select: { id: true, status: true, storeId: true },
    });

    if (!bill) {
      throw new CustomError({
        statusCode: 404,
        message: "Bill not found",
        errorCode: "NOT_FOUND",
        isOperational: true,
      });
    }

    await validateStoreAuth(bill.storeId, requesterId);

    validateTransition(bill.status, status);

    return prisma.bill.update({
      where: { id },
      data: {
        status,
        ...(status === "PAID" && { paidAt: new Date() }),
      },
    });
  },
  /**
   * Retrieves all bills for a store.
   * @param storeId - The ID of the store.
   * @returns Array of bills with their details.
   */
  async getBillsByStore(storeId: string) {
    return prisma.bill.findMany({
      where: { storeId },
      include: { billDetails: true },
      orderBy: { createdAt: "desc" },
    });
  },
  /**
   * Retrieves a single bill by ID.
   * @param billId - The ID of the bill.
   * @throws A CustomError if the bill is not found.
   * @returns The bill with its details.
   */
  async getBillById(billId: string) {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        billDetails: {
          include: {
            product: true,
            productVariant: true,
          },
        },
      },
    });

    if (!bill) {
      throw new CustomError({
        statusCode: 404,
        message: "Bill not found",
        errorCode: "NOT_FOUND",
        isOperational: true,
      });
    }

    return bill;
  },
};
