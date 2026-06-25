import * as Sentry from "@sentry/node";
import ApiErrorResponse from "../errors/apiErrorResponse";
import { deleteImage } from "../lib/imagekit";
import prisma from "../lib/prisma";
import { ProductRepository } from "../repositories/product.repository";
import type { ProductTypeRepository } from "../repositories/productType.repository";
import type { SubCategoryRepository } from "../repositories/subcategory.repository";
import type {
  CreateProductPayload,
  GetProductsByStoreQuery,
  Product,
  UpdateProductPayload,
} from "../types/product";
import type { PaginatedResponse } from "../types/pagination";
import { validateStoreOwner } from "../utils/storeAuth";
import type { IProductService } from "./interfaces/product.interface";

/**
 * Business logic for the Product feature. Orchestrates repository calls, applies
 * cross-entity validation, and implements the hybrid hard/soft delete strategy
 * for variants (see docs/PRODUCT.md for the design rationale).
 *
 * Uses repositories from three features (Product, ProductType, SubCategory) to
 * keep foreign-key validation in the same layer that owns the writes.
 */
export class ProductService implements IProductService {
  private productRepository: ProductRepository;
  private productTypeRepository: ProductTypeRepository;
  private subCategoryRepository: SubCategoryRepository;

  constructor(
    productRepository: ProductRepository,
    productTypeRepository: ProductTypeRepository,
    subCategoryRepository: SubCategoryRepository,
  ) {
    this.productRepository = productRepository;
    this.productTypeRepository = productTypeRepository;
    this.subCategoryRepository = subCategoryRepository;
  }

  /**
   * Creates a new product in the given store, along with its first image and
   * its variants (all created in a single Prisma transaction by the repository).
   *
   * Validations (in order):
   * - Requester is the store owner (403 otherwise)
   * - No other product in the same store has the same name (409)
   * - The product type exists and belongs to the store (404)
   * - The sub-category exists, belongs to the store, and belongs to the given product type (404)
   *
   * @param data Product payload including storeId, productTypeId, subCategoryId, image, variants
   * @param requesterId Clerk user id of the requester (must match `Store.userId`)
   * @throws ApiErrorResponse 403 if requester is not the store owner
   * @throws ApiErrorResponse 409 if a product with the same name already exists in this store
   * @throws ApiErrorResponse 404 if the product type or sub-category does not exist or does not belong to the store
   */
  async createProduct(
    data: CreateProductPayload,
    requesterId: string,
  ): Promise<void> {
    await validateStoreOwner(data.storeId, requesterId);

    const existingProductName =
      await this.productRepository.findProductByNameAndStoreId(
        data.name,
        data.storeId,
      );

    if (existingProductName) {
      throw new ApiErrorResponse({
        statusCode: 409,
        message: "A product with the same name already exists in this store",
        isOperational: true,
      });
    }

    const productTypeExists =
      await this.productTypeRepository.validateProductType(
        data.productTypeId,
        data.storeId,
      );

    if (!productTypeExists) {
      throw new ApiErrorResponse({
        statusCode: 404,
        message: "Product type not found or does not belong to the store",
        isOperational: true,
      });
    }

    const subCategoryExists =
      await this.subCategoryRepository.validateSubCategory(
        data.subCategoryId,
        data.storeId,
        data.productTypeId,
      );

    if (!subCategoryExists) {
      throw new ApiErrorResponse({
        statusCode: 404,
        message:
          "Sub category not found or does not belong to the store or product type",
        isOperational: true,
      });
    }

    await this.productRepository.createProduct(data);
  }

  /**
   * Updates a product's fields, its variants, and optionally its image.
   *
   * Validations (in order):
   * - Product exists (404)
   * - Requester is the store owner (403)
   * - New name (if provided and different) does not conflict with another product in the store (409)
   * - New product type (if provided) belongs to the store (404)
   * - The final `(subCategoryId, productTypeId)` combination belongs to the store (404)
   * - All ids in `variantsToDelete` / `variantsToUpdate` belong to this product (400)
   * - After the update, the product still has at least one active variant (400)
   *
   * After validation, splits `variantsToDelete` into two arrays based on
   * whether each variant has associated `billDetails`:
   * - `variantsToHardDelete` — variants with no bills (true removal)
   * - `variantsToSoftDelete` — variants with bills (`active = false`, kept in DB)
   *
   * If `data.image` is provided, the old image is replaced in the same
   * transaction; the old ImageKit file is deleted **after** the transaction
   * commits (best-effort, failures logged via Sentry).
   *
   * @param data Update payload (id required, all other fields optional)
   * @param requesterId Clerk user id of the requester (must match `Store.userId`)
   * @throws ApiErrorResponse 400/403/404/409 as described above
   */
  async updateProduct(
    data: UpdateProductPayload,
    requesterId: string,
  ): Promise<void> {
    const existingProduct = await this.productRepository.findProductForUpdate(
      data.id,
    );

    if (!existingProduct) {
      throw new ApiErrorResponse({
        statusCode: 404,
        message: "Product not found",
        isOperational: true,
      });
    }

    await validateStoreOwner(existingProduct.storeId, requesterId);

    if (data.name && data.name !== existingProduct.name) {
      const nameConflict =
        await this.productRepository.findProductByNameAndStoreId(
          data.name,
          existingProduct.storeId,
        );

      if (nameConflict && nameConflict.id !== data.id) {
        throw new ApiErrorResponse({
          statusCode: 409,
          message: "A product with the same name already exists in this store",
          isOperational: true,
        });
      }
    }

    // Compute the final (productTypeId, subCategoryId) pair so we can validate
    // consistency when either (or both) are being changed.
    const finalProductTypeId =
      data.productTypeId ?? existingProduct.productTypeId;
    const finalSubCategoryId =
      data.subCategoryId ?? existingProduct.subCategoryId;

    if (data.productTypeId) {
      const productTypeExists =
        await this.productTypeRepository.validateProductType(
          data.productTypeId,
          existingProduct.storeId,
        );

      if (!productTypeExists) {
        throw new ApiErrorResponse({
          statusCode: 404,
          message: "Product type not found or does not belong to the store",
          isOperational: true,
        });
      }
    }

    if (data.productTypeId || data.subCategoryId) {
      const subCategoryExists =
        await this.subCategoryRepository.validateSubCategory(
          finalSubCategoryId,
          existingProduct.storeId,
          finalProductTypeId,
        );

      if (!subCategoryExists) {
        throw new ApiErrorResponse({
          statusCode: 404,
          message:
            "Sub category not found or does not belong to the store or product type",
          isOperational: true,
        });
      }
    }

    const existingVariantIds = existingProduct.variants.map((v) => v.id);

    if (data.variantsToDelete?.length) {
      const invalidIds = data.variantsToDelete.filter(
        (id) => !existingVariantIds.includes(id),
      );

      if (invalidIds.length) {
        throw new ApiErrorResponse({
          statusCode: 400,
          message: "Some variants to delete do not belong to this product",
          isOperational: true,
        });
      }
    }

    if (data.variantsToUpdate?.length) {
      const invalidIds = data.variantsToUpdate.filter(
        (v) => !existingVariantIds.includes(v.id),
      );

      if (invalidIds.length) {
        throw new ApiErrorResponse({
          statusCode: 400,
          message: "Some variants to update do not belong to this product",
          isOperational: true,
        });
      }
    }

    // Split variantsToDelete into hard (no bills) and soft (has bills) so we
    // never break the FK from BillDetail.productVariantId. `hasBillDetails` is
    // a boolean computed via take: 1 — see findProductForUpdate.
    const variantsWithBills = new Set(
      existingProduct.variants
        .filter((v) => v.hasBillDetails)
        .map((v) => v.id),
    );

    const variantsToHardDelete = data.variantsToDelete?.filter(
      (id) => !variantsWithBills.has(id),
    );
    const variantsToSoftDelete = data.variantsToDelete?.filter((id) =>
      variantsWithBills.has(id),
    );

    // Minimum-one-active-variant invariant: count the final state.
    const variantsToDeleteSet = new Set(data.variantsToDelete ?? []);
    const variantsToUpdateMap = new Map(
      (data.variantsToUpdate ?? []).map((v) => [v.id, v]),
    );

    let finalActiveCount = 0;

    for (const v of existingProduct.variants) {
      if (variantsToDeleteSet.has(v.id)) continue;
      const update = variantsToUpdateMap.get(v.id);
      const finalActive =
        update?.active !== undefined ? update.active : v.active;
      if (finalActive) finalActiveCount++;
    }

    // New variants are always created with active=true.
    finalActiveCount += data.variantsToAdd?.length ?? 0;

    if (finalActiveCount < 1) {
      throw new ApiErrorResponse({
        statusCode: 400,
        message: "A product must have at least one variant",
        isOperational: true,
      });
    }

    const { oldImageFileId } = await this.productRepository.updateProduct({
      ...data,
      ...(variantsToHardDelete && variantsToHardDelete.length > 0 && {
        variantsToHardDelete,
      }),
      ...(variantsToSoftDelete && variantsToSoftDelete.length > 0 && {
        variantsToSoftDelete,
      }),
    });

    if (oldImageFileId && data.image) {
      try {
        await deleteImage(oldImageFileId);
      } catch (error) {
        Sentry.captureMessage(
          "Failed to delete old image from ImageKit after product update",
          {
            level: "warning",
            extra: {
              fileId: oldImageFileId,
              reason: error,
              productId: data.id,
              storeId: existingProduct.storeId,
            },
          },
        );
      }
    }
  }

  /**
   * Hard-deletes a product (with its variants and image). Variants and images
   * are removed via the cascade-like delete in the repository (deleteMany +
   * delete in one transaction).
   *
   * Validations:
   * - Product exists (404)
   * - Requester is the store owner (403)
   * - Product has no `BillDetail` rows (409) — we cannot delete a product
   *   that has historical sales references. (Note: this only checks the
   *   product-level bills. Variant-level bills are handled via soft-delete
   *   in `updateProduct`.)
   *
   * @param productId Id of the product to delete
   * @param requesterId Clerk user id of the requester
   * @throws ApiErrorResponse 404/403/409 as described above
   */
  async deleteProduct(productId: string, requesterId: string): Promise<void> {
    const product = await this.productRepository.findProductForDeletion(
      productId,
    );

    if (!product) {
      throw new ApiErrorResponse({
        statusCode: 404,
        message: "Product not found",
        isOperational: true,
      });
    }

    await validateStoreOwner(product.storeId, requesterId);

    if (product.hasBillDetails) {
      throw new ApiErrorResponse({
        statusCode: 409,
        message: "Cannot delete a product that has associated bill details",
        isOperational: true,
      });
    }

    await this.productRepository.deleteProduct(productId);

    if (product.imageFileId) {
      try {
        await deleteImage(product.imageFileId);
      } catch (error) {
        Sentry.captureMessage("Failed to delete image from ImageKit", {
          level: "warning",
          extra: {
            fileId: product.imageFileId,
            reason: error,
            productId,
            storeId: product.storeId,
          },
        });
      }
    }
  }

  /**
   * Returns a paginated list of products in a store, including all variants
   * (active + inactive) with a `hasBillDetails` boolean per variant. The
   * client filters by `active` to display only currently-visible variants in
   * cards. `hasBillDetails` is computed via `take: 1` for performance — see
   * `findProductForUpdate` for the same pattern.
   *
   * Filters supported via `GetProductsByStoreQuery`:
   * - `status` — `active` / `inactive` / `all` (product-level active flag)
   * - `search` — substring match on `name`
   * - `productTypeId` / `subCategoryId` — exact match
   * - `page`, `limit` — pagination (default 10 per page)
   *
   * @param storeId Id of the store to list products for
   * @param filters Query filters (see `GetProductsByStoreQuery`)
   * @throws ApiErrorResponse 404 if the store does not exist
   */
  async getProductsByStore(
    storeId: string,
    filters: GetProductsByStoreQuery,
  ): Promise<PaginatedResponse<Product>> {
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
      ...(filters.subCategoryId && { subCategoryId: filters.subCategoryId }),
      ...(filters.status === "active" && { active: true }),
      ...(filters.status === "inactive" && { active: false }),
      ...(filters.search && {
        name: { contains: filters.search },
      }),
    };

    const [items, total] = await Promise.all([
      await prisma.product.findMany({
        where: where,
        select: {
          id: true,
          name: true,
          description: true,
          active: true,
          productTypeId: true,
          subCategoryId: true,
          image: {
            select: {
              url: true,
              fileId: true,
            },
          },
          variants: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              active: true,
              billDetails: { select: { id: true }, take: 1 },
            },
          },
        },
        take: limit,
        skip: skip,
        orderBy: { createdAt: "desc" },
      }),
      await prisma.product.count({
        where: where,
      }),
    ]);

    const itemsWithTypedVariants = items.map((product) => ({
      ...product,
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        stock: v.stock,
        active: v.active,
        hasBillDetails: v.billDetails.length > 0,
      })),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      items: itemsWithTypedVariants,
      pagination: {
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
