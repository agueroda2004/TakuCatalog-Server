import ApiErrorResponse from "../errors/apiErrorResponse";
import CustomError, { throwNotFound } from "../errors/customError";
import prisma from "../lib/prisma";
import type { IProductTypeRepository } from "../repositories/interfaces/productType.interface";
import type { CreateProductTypeDTO } from "../schemas/productType.schema";
import type { PaginatedResponse } from "../types/pagination";
import type {
  ProductType,
  GetProductTypesByStoreQuery,
  CreateProductTypePayload,
  UpdateProductTypePayload,
} from "../types/productType";
import { validateStoreOwner } from "../utils/storeAuth";
import type { IProductTypeService } from "./interfaces/productType.interface";

export class ProductTypeService implements IProductTypeService {
  private productTypeRepository: IProductTypeRepository;

  constructor(productTypeRepository: IProductTypeRepository) {
    this.productTypeRepository = productTypeRepository;
  }
  /**
   * Function to create a new product type.
   * @param data - Data for creating a new product type.
   * @param requesterId - ID of the user making the request.
   * @returns The created product type.
   * @throws {CustomError} Throws a CustomError if a product type with the same name already exists.
   */
  async createProductType(
    data: CreateProductTypePayload,
    requesterId: string,
  ): Promise<void> {
    await validateStoreOwner(data.storeId, requesterId);

    const existingProductType =
      await this.productTypeRepository.validateProductTypeName(
        data.name,
        data.storeId,
      );

    if (existingProductType) {
      throw new ApiErrorResponse({
        statusCode: 409,
        message: "A product type with the same name already exists",
        isOperational: true,
      });
    }

    await this.productTypeRepository.createProductType(data);
  }

  /**
   * Function to update an existing product type.
   * @param {id, ...fields} - Object containing the ID of the product type to update and the fields to update.
   * @param requesterId - ID of the user making the request.
   * @returns The updated product type.
   * @throws {CustomError} Throws a CustomError if the product type is not found.
   */
  async updateProductType(
    id: string,
    storeId: string,
    data: UpdateProductTypePayload,
    requesterId: string,
  ): Promise<void> {
    await validateStoreOwner(storeId, requesterId);

    const productType =
      await this.productTypeRepository.validateProductTypeInStore(id, storeId);

    if (!productType) {
      throw new ApiErrorResponse({
        statusCode: 404,
        message: "Product type not found",
        isOperational: true,
      });
    }

    if (data.name && data.name !== productType.name) {
      const existingProductType =
        await this.productTypeRepository.validateProductTypeName(
          data.name,
          storeId,
        );

      if (existingProductType) {
        throw new ApiErrorResponse({
          statusCode: 409,
          message: "A product type with the same name already exists",
          isOperational: true,
        });
      }
    }

    await this.productTypeRepository.updateProductType(id, data);
  }

  /**
   * Function to delete or soft delete a product type.
   * @param id - The ID of the product type to delete.
   * @param requesterId - The ID of the user making the request.
   * @returns A string indicating whether the product type was "deleted" or "soft-deleted".
   * @throws {CustomError} Throws a CustomError if the product type is not found.
   */
  async deleteProductType(id: string, storeId: string, requesterId: string) {
    await validateStoreOwner(storeId, requesterId);

    const productType =
      await this.productTypeRepository.validateProductTypeHasRecords(
        id,
        storeId,
      );

    if (!productType) {
      throw new ApiErrorResponse({
        statusCode: 404,
        message: "Product type not found",
        isOperational: true,
      });
    }

    const hasProducts = productType.products.length > 0;
    const hasSubCategories = productType.subCategories.length > 0;

    if (hasSubCategories) {
      throw new ApiErrorResponse({
        statusCode: 400,
        message: "Cannot delete product type with associated subcategories.",
        isOperational: true,
      });
    }

    if (hasProducts) {
      throw new ApiErrorResponse({
        statusCode: 400,
        message: "Cannot delete product type with associated products.",
        isOperational: true,
      });
    }

    await this.productTypeRepository.deleteProductType(id, storeId);
  }

  /**
   * Function to get all active product types for a specific store.
   * @param storeId - The ID of the store to get product types for.
   * @returns An array of active product types for the specified store.
   */
  async getProductTypesByStore(
    storeId: string,
    filters: GetProductTypesByStoreQuery,
  ): Promise<PaginatedResponse<ProductType>> {
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
      ...(filters.status === "active" && { active: true }),
      ...(filters.status === "inactive" && { active: false }),
      ...(filters.search && {
        name: { contains: filters.search },
      }),
    };

    const [items, total] = await Promise.all([
      await prisma.productType.findMany({
        where: where,
        select: {
          id: true,
          name: true,
          active: true,
          _count: {
            select: { products: true },
          },
        },
        take: Number(filters.limit),
        skip: skip,
        orderBy: { createdAt: "desc" },
      }),
      await prisma.productType.count({
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

  async getProductTypesByStoreDropdown(
    storeId: string,
  ): Promise<{ id: string; name: string }[]> {
    const productTypes = await prisma.productType.findMany({
      where: {
        storeId: storeId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return productTypes;
  }
}
