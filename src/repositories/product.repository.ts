import prisma from "../lib/prisma";
import type {
  CreateProductPayload,
  UpdateProductPayload,
} from "../types/product";
import type { IProductRepository } from "./interfaces/product.interface";

/**
 * Repository for the Product feature. Pure data-access layer: no business
 * rules, no validation. Each method maps to one or a small group of Prisma
 * operations. Multi-step writes are wrapped in `prisma.$transaction` for
 * atomicity.
 *
 * The hybrid hard/soft delete strategy for variants lives in the service:
 * this repository expects `variantsToHardDelete` and `variantsToSoftDelete`
 * to already be split.
 */
export class ProductRepository implements IProductRepository {
  /**
   * Creates a product with its image and initial variants. All inserts happen
   * inside a single Prisma `create` call (Prisma wraps it in a transaction).
   * Variants with undefined `stock` are stored as `null` (semantic: store
   * does not manage its own stock).
   */
  async createProduct(data: CreateProductPayload) {
    await prisma.product.create({
      data: {
        name: data.name,
        description: data.description ? data.description : null,
        store: { connect: { id: data.storeId } },
        type: { connect: { id: data.productTypeId } },
        subCategory: { connect: { id: data.subCategoryId } },
        // Image creation
        image: {
          create: {
            url: data.image.url,
            fileId: data.image.fileId,
          },
        },
        // Product Variants creation
        variants:
          data.variants && data.variants.length > 0
            ? {
                create: data.variants.map((variant) => ({
                  name: variant.name,
                  price: variant.price,
                  stock: variant.stock ?? null,
                })),
              }
            : {},
      },
    });
  }

  /**
   * Returns the product's id (or null) — minimal projection used when only
   * existence needs to be checked.
   */
  async findProductById(productId: string) {
    return await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
      },
    });
  }

  /**
   * Returns the id of the first product in a store matching the given name,
   * or null. Used by the service for name-conflict checks on create/update
   * (the service excludes the current product's id on update).
   */
  async findProductByNameAndStoreId(name: string, storeId: string) {
    return await prisma.product.findFirst({
      where: {
        name: name,
        storeId: storeId,
      },
      select: {
        id: true,
      },
    });
  }

  /**
   * Returns the minimum data needed by the service to validate a delete:
   * - `storeId` for ownership check
   * - `hasBillDetails` (existence of any BillDetail) — true blocks deletion
   * - `imageFileId` for ImageKit cleanup after a successful delete
   */
  async findProductForDeletion(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        storeId: true,
        billDetails: { select: { id: true }, take: 1 },
        image: { select: { fileId: true } },
      },
    });

    if (!product) {
      return null;
    }

    return {
      storeId: product.storeId,
      hasBillDetails: product.billDetails.length > 0,
      imageFileId: product.image?.fileId ?? null,
    };
  }

  /**
   * Hard-deletes a product along with its variants and image. The
   * `prisma.$transaction` array ensures atomicity. The ImageKit file for the
   * product image is NOT deleted here — the service handles that after this
   * method returns successfully (so the DB rollback path leaves the image
   * intact).
   */
  async deleteProduct(productId: string): Promise<void> {
    await prisma.$transaction([
      prisma.productVariant.deleteMany({ where: { productId } }),
      prisma.image.deleteMany({ where: { productId } }),
      prisma.product.delete({ where: { id: productId } }),
    ]);
  }

  /**
   * Returns the data needed by the service to validate and execute an update:
   * - Identifying + ownership fields (`storeId`, `name`)
   * - FK fields (`productTypeId`, `subCategoryId`) for consistency checks
   * - Full variant list with `hasBillDetails` boolean (used to decide hard
   *   vs soft delete and to enforce the minimum-one-active-variant invariant)
   * - Current image fileId for ImageKit cleanup if the image is replaced
   *
   * **Performance note:** `hasBillDetails` is computed via `take: 1` (early
   * termination at the first row) rather than `_count`. This avoids scanning
   * potentially thousands of `BillDetail` rows per variant for a boolean
   * answer. The same pattern is used by `findProductForDeletion`.
   *
   * Returns all variants regardless of `active` — the service and client
   * decide what to show. The `Decimal` `price` is converted to `number`
   * to match the JSON-over-the-wire shape.
   */
  async findProductForUpdate(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        storeId: true,
        name: true,
        productTypeId: true,
        subCategoryId: true,
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
        image: { select: { fileId: true } },
      },
    });

    if (!product) {
      return null;
    }

    return {
      storeId: product.storeId,
      name: product.name,
      productTypeId: product.productTypeId,
      subCategoryId: product.subCategoryId,
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        stock: v.stock,
        active: v.active,
        hasBillDetails: v.billDetails.length > 0,
      })),
      imageFileId: product.image?.fileId ?? null,
    };
  }

  /**
   * Updates a product, optionally its image, and applies the three variant
   * arrays in a single transaction. Expected split from the service:
   * - `variantsToHardDelete`: variants with no `billDetails` (true remove)
   * - `variantsToSoftDelete`: variants with `billDetails` (`active = false`)
   * - `variantsToUpdate`: existing variants to patch (only defined fields
   *   are applied; supports `name`, `price`, `stock`, `active` flip for
   *   reactivation)
   * - `variantsToAdd`: new variants (created with `active = true` by default;
   *   `stock` defaults to `null` if undefined — see note below)
   *
   * Returns the previous image's ImageKit fileId (if any) so the service can
   * delete it after the transaction commits.
   *
   * **Stock semantics:** undefined `stock` on `variantsToAdd` is stored as
   * `null` (NOT `0`). Null means the store does not manage its own stock —
   * do not change this to `0` or the contract breaks. See docs/PRODUCT.md.
   */
  async updateProduct(data: UpdateProductPayload): Promise<{
    oldImageFileId: string | null;
  }> {
    return await prisma.$transaction(async (tx) => {
      const oldImage = await tx.image.findUnique({
        where: { productId: data.id },
        select: { fileId: true },
      });

      const oldImageFileId = oldImage?.fileId ?? null;

      if (data.image) {
        await tx.image.deleteMany({ where: { productId: data.id } });
      }

      if (data.variantsToHardDelete?.length) {
        await tx.productVariant.deleteMany({
          where: {
            id: { in: data.variantsToHardDelete },
            productId: data.id,
          },
        });
      }

      if (data.variantsToSoftDelete?.length) {
        await tx.productVariant.updateMany({
          where: {
            id: { in: data.variantsToSoftDelete },
            productId: data.id,
          },
          data: { active: false },
        });
      }

      if (data.variantsToUpdate?.length) {
        await Promise.all(
          data.variantsToUpdate.map(({ id, ...fields }) =>
            tx.productVariant.update({
              where: { id, productId: data.id },
              data: {
                ...(fields.name !== undefined && { name: fields.name }),
                ...(fields.price !== undefined && { price: fields.price }),
                ...(fields.stock !== undefined && { stock: fields.stock }),
                ...(fields.active !== undefined && { active: fields.active }),
              },
            }),
          ),
        );
      }

      await tx.product.update({
        where: { id: data.id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.productTypeId && {
            type: { connect: { id: data.productTypeId } },
          }),
          ...(data.subCategoryId && {
            subCategory: { connect: { id: data.subCategoryId } },
          }),
          ...(data.variantsToAdd?.length && {
            variants: {
              createMany: {
                data: data.variantsToAdd.map((variant) => ({
                  name: variant.name,
                  price: variant.price,
                  stock: variant.stock ?? null,
                })),
              },
            },
          }),
          ...(data.image && {
            image: {
              create: {
                url: data.image.url,
                fileId: data.image.fileId,
              },
            },
          }),
        },
      });

      return { oldImageFileId };
    });
  }
}
