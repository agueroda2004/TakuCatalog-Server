import prisma from "../lib/prisma";
import type { ISubCategoryRepository } from "./interfaces/subcategory.interface";

export class SubCategoryRepository implements ISubCategoryRepository {
  async validateSubCategory(
    subCategoryId: string,
    storeId: string,
    productTypeId: string,
  ) {
    return await prisma.subCategory.findFirst({
      where: {
        id: subCategoryId,
        productTypeId: productTypeId,
        storeId: storeId,
      },
      select: {
        id: true,
      },
    });
  }
}
