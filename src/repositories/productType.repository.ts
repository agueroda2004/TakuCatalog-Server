import prisma from "../lib/prisma";
import type { UpdateProductTypePayload } from "../types/productType";
import type { IProductTypeRepository } from "./interfaces/productType.interface";

export class ProductTypeRepository implements IProductTypeRepository {
  async createProductType(data: { name: string; storeId: string }) {
    return await prisma.productType.create({
      data: {
        name: data.name,
        storeId: data.storeId,
      },
      select: {
        id: true,
      },
    });
  }

  async updateProductType(
    productTypeId: string,
    data: UpdateProductTypePayload,
  ) {
    await prisma.productType.update({
      where: { id: productTypeId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
      select: {
        id: true,
      },
    });
  }

  async deleteProductType(productTypeId: string, storeId: string) {
    await prisma.productType.deleteMany({
      where: {
        id: productTypeId,
        storeId: storeId,
      },
    });
  }

  async validateProductType(productTypeId: string, storeId: string) {
    return await prisma.productType.findFirst({
      where: {
        id: productTypeId,
        storeId: storeId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async validateProductTypeName(name: string, storeId: string) {
    return await prisma.productType.findFirst({
      where: {
        name: name,
        storeId: storeId,
      },
      select: {
        id: true,
      },
    });
  }

  async validateProductTypeHasRecords(productTypeId: string, storeId: string) {
    return await prisma.productType.findFirst({
      where: {
        id: productTypeId,
        storeId: storeId,
      },
      select: {
        products: {
          select: {
            id: true,
          },
        },
        subCategories: {
          select: {
            id: true,
          },
        },
      },
    });
  }
}
