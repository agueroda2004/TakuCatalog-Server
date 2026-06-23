import prisma from "../lib/prisma";
import type { IProductTypeRepository } from "./interfaces/productType.interface";

export class ProductTypeRepository implements IProductTypeRepository {
  async validateProductType(productTypeId: string, storeId: string) {
    return await prisma.productType.findFirst({
      where: {
        id: productTypeId,
        storeId: storeId,
      },
      select: {
        id: true,
      },
    });
  }
}
