import prisma from "../lib/prisma";
import type {
  CreateSubCategoryPayload,
  UpdateSubCategoryPayload,
} from "../types/subcategory";
import type { ISubCategoryRepository } from "./interfaces/subcategory.interface";

export class SubCategoryRepository implements ISubCategoryRepository {
  async createSubCategory(data: CreateSubCategoryPayload) {
    await prisma.subCategory.create({
      data: {
        name: data.name,
        storeId: data.storeId,
        productTypeId: data.productTypeId,
      },
      select: {
        id: true,
      },
    });
  }

  async updateSubCategory(
    subCategoryId: string,
    data: UpdateSubCategoryPayload,
  ) {
    await prisma.subCategory.update({
      where: { id: subCategoryId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  async deleteSubCategory(subCategoryId: string, storeId: string) {
    await prisma.subCategory.delete({
      where: { id: subCategoryId, storeId: storeId },
    });
  }

  async validateSubCategoryInStoreAndProductType(
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

  async validateSubCategoryName(
    name: string,
    storeId: string,
    productTypeId: string,
  ) {
    return prisma.subCategory.findFirst({
      where: {
        name: name,
        storeId: storeId,
        productTypeId: productTypeId,
      },
      select: {
        id: true,
      },
    });
  }

  async validateSubCategoryInStore(subCategoryId: string, storeId: string) {
    return prisma.subCategory.findFirst({
      where: {
        id: subCategoryId,
        storeId: storeId,
      },
      select: {
        id: true,
        productTypeId: true,
        name: true,
      },
    });
  }

  async validateSubCategoryHasRecords(subCategoryId: string, storeId: string) {
    return prisma.subCategory.findFirst({
      where: {
        id: subCategoryId,
        storeId: storeId,
      },
      select: {
        products: {
          take: 1,
          select: { id: true },
        },
      },
    });
  }
}
