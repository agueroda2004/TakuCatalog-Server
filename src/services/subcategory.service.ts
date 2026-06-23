import ApiErrorResponse from "../errors/apiErrorResponse";
import prisma from "../lib/prisma";
import type { IProductTypeRepository } from "../repositories/interfaces/productType.interface";
import type { ISubCategoryRepository } from "../repositories/interfaces/subcategory.interface";
import type { PaginatedResponse } from "../types/pagination";
import type {
  CreateSubCategoryPayload,
  GetSubCategoriesByStoreQuery,
  SubCategory,
  UpdateSubCategoryPayload,
} from "../types/subcategory";
import { validateStoreOwner } from "../utils/storeAuth";
import type { ISubCategoryService } from "./interfaces/subcategory.interface";

export class SubCategoryService implements ISubCategoryService {
  private subCategoryRepository: ISubCategoryRepository;
  private productTypeRepository: IProductTypeRepository;

  constructor(
    subCategoryRepository: ISubCategoryRepository,
    productTypeRepository: IProductTypeRepository,
  ) {
    this.subCategoryRepository = subCategoryRepository;
    this.productTypeRepository = productTypeRepository;
  }

  async createSubCategory(
    data: CreateSubCategoryPayload,
    requesterId: string,
  ): Promise<void> {
    await validateStoreOwner(data.storeId, requesterId);

    const productTypeExists =
      await this.productTypeRepository.validateProductTypeInStore(
        data.productTypeId,
        data.storeId,
      );

    if (!productTypeExists) {
      throw new ApiErrorResponse({
        statusCode: 404,
        message: "Product type not found in this store",
        isOperational: true,
      });
    }

    const existingSubCategory =
      await this.subCategoryRepository.validateSubCategoryName(
        data.name,
        data.storeId,
        data.productTypeId,
      );

    if (existingSubCategory) {
      throw new ApiErrorResponse({
        statusCode: 409,
        message:
          "A subcategory with the same name already exists in this product type",
        isOperational: true,
      });
    }

    await this.subCategoryRepository.createSubCategory(data);
  }

  async updateSubCategory(
    id: string,
    data: UpdateSubCategoryPayload,
    requesterId: string,
    storeId: string,
  ): Promise<void> {
    await validateStoreOwner(storeId, requesterId);

    const subCategory =
      await this.subCategoryRepository.validateSubCategoryInStore(id, storeId);

    if (!subCategory) {
      throw new ApiErrorResponse({
        statusCode: 404,
        message: "Subcategory not found in this store",
        isOperational: true,
      });
    }

    if (data.name && data.name !== subCategory.name) {
      const existingSubCategory =
        await this.subCategoryRepository.validateSubCategoryName(
          data.name,
          storeId,
          subCategory.productTypeId,
        );

      if (existingSubCategory) {
        throw new ApiErrorResponse({
          statusCode: 409,
          message:
            "A subcategory with the same name already exists in this store",
          isOperational: true,
        });
      }
    }

    await this.subCategoryRepository.updateSubCategory(id, data);
  }

  async deleteSubCategory(
    id: string,
    requesterId: string,
    storeId: string,
  ): Promise<void> {
    await validateStoreOwner(storeId, requesterId);

    const subCategory =
      await this.subCategoryRepository.validateSubCategoryHasRecords(
        id,
        storeId,
      );

    if (!subCategory) {
      throw new ApiErrorResponse({
        statusCode: 404,
        message: "Subcategory not found in this store",
        isOperational: true,
      });
    }

    const hasProducts = subCategory.products.length > 0;

    if (hasProducts) {
      throw new ApiErrorResponse({
        statusCode: 400,
        message: "Cannot delete subcategory with associated products.",
        isOperational: true,
      });
    }

    await this.subCategoryRepository.deleteSubCategory(id, storeId);
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
        orderBy: { createdAt: "desc" },
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
