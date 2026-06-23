import ApiErrorResponse from "../errors/apiErrorResponse";
import prisma from "../lib/prisma";
import type { PaginatedResponse } from "../types/pagination";
import type {
  CreateSubCategoryDTO,
  GetSubCategoriesByStoreQuery,
  SubCategory,
  UpdateSubCategoryDTO,
} from "../types/subcategory";
import { validateStoreOwner } from "../utils/storeAuth";
import type { ISubCategoryService } from "./interfaces/subcategory.interface";

export class SubCategoryService implements ISubCategoryService {
  async createSubCategory(
    data: CreateSubCategoryDTO,
    requesterId: string,
  ): Promise<void> {
    await validateStoreOwner(data.storeId, requesterId);

    const existingSubCategory = await prisma.subCategory.findFirst({
      where: {
        storeId: data.storeId,
        name: data.name,
        productTypeId: data.productTypeId,
      },
      select: { id: true },
    });

    if (existingSubCategory) {
      throw new ApiErrorResponse({
        statusCode: 409,
        message:
          "A subcategory with the same name already exists in this product type",
        isOperational: true,
      });
    }

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
    id: string,
    data: UpdateSubCategoryDTO,
    requesterId: string,
  ): Promise<void> {
    const subCategory = await prisma.subCategory.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        active: true,
        productTypeId: true,
        storeId: true,
      },
    });

    if (!subCategory) {
      throw new ApiErrorResponse({
        statusCode: 404,
        message: "Subcategory not found",
        isOperational: true,
      });
    }

    await validateStoreOwner(subCategory.storeId, requesterId);

    if (data.name && data.name !== subCategory.name) {
      const existingSubCategory = await prisma.subCategory.findFirst({
        where: {
          storeId: subCategory.storeId,
          name: data.name,
          id: { not: subCategory.id },
        },
        select: { id: true },
      });

      if (existingSubCategory) {
        throw new ApiErrorResponse({
          statusCode: 409,
          message:
            "A subcategory with the same name already exists in this store",
          isOperational: true,
        });
      }
    }

    const dataToUpdate: { name?: string; active?: boolean } = {};

    if (data.name !== undefined) dataToUpdate["name"] = data.name;
    if (data.active !== undefined) dataToUpdate["active"] = data.active;

    if (Object.keys(dataToUpdate).length === 0) {
      throw new ApiErrorResponse({
        statusCode: 400,
        message: "No valid fields provided for update",
        isOperational: true,
      });
    }

    await prisma.subCategory.update({
      where: { id: subCategory.id },
      data: { ...dataToUpdate },
      select: { id: true },
    });
  }

  async deleteSubCategory(id: string, requesterId: string): Promise<void> {
    const subCategory = await prisma.subCategory.findUnique({
      where: { id },
      select: {
        id: true,
        storeId: true,
        products: {
          take: 1,
          select: { id: true },
        },
      },
    });

    if (!subCategory) {
      throw new ApiErrorResponse({
        statusCode: 404,
        message: "Subcategory not found",
        isOperational: true,
      });
    }

    await validateStoreOwner(subCategory.storeId, requesterId);

    const hasProducts = subCategory.products.length > 0;

    if (hasProducts) {
      throw new ApiErrorResponse({
        statusCode: 400,
        message: "Cannot delete subcategory with associated products.",
        isOperational: true,
      });
    }

    await prisma.subCategory.delete({
      where: { id: subCategory.id },
      select: { id: true },
    });
  }

  async getSubCategoriesByStore(
    storeId: string,
    filters: GetSubCategoriesByStoreQuery,
  ): Promise<PaginatedResponse<SubCategory>> {
    const storeExists = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });

    if (!storeExists) {
      throw new ApiErrorResponse({
        statusCode: 404,
        message: "Store not found",
        isOperational: true,
      });
    }

    const page = filters.page ? Number(filters.page) : 1;
    const limit = filters.limit ? Number(filters.limit) : 10;
    const skip = (page - 1) * limit;

    const where = {
      storeId: storeId,
      ...(filters.productTypeId && { productTypeId: filters.productTypeId }),
      ...(filters.status === "active" && { active: true }),
      ...(filters.status === "inactive" && { active: false }),
      ...(filters.search && {
        name: { contains: filters.search },
      }),
    };

    const [items, total] = await Promise.all([
      await prisma.subCategory.findMany({
        where: where,
        select: {
          id: true,
          name: true,
          active: true,
          productTypeId: true,
          _count: {
            select: { products: true },
          },
        },
        take: limit,
        skip: skip,
      }),
      await prisma.subCategory.count({
        where: where,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
