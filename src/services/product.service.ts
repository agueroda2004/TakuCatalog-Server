import CustomError from "../errors/customError";
import { deleteImage } from "../lib/imagekit";
import prisma from "../lib/prisma";
import type {
  CreateProductDTO,
  UpdateProductDTO,
} from "../schemas/product.schema";
import { validateStoreOwner } from "../utils/storeAuth";
import * as Sentry from "@sentry/node";

/**
 * Service to manage all the CRUD functions like create, update, delete and fetch products.
 */
export const productService = {
  /**
   * Function to create a new product in a store. Validates that the requester has authorization to manage the store, checks for the existence of the specified brand and product type, and ensures that there are no naming conflicts with existing products in the same store. Generates a unique slug for the product and creates associated variants and images in a single transaction.
   * @param data - An object containing the details of the product to be created (CreateProductDTO src/schema/product.schema.ts)
   * @param requesterId - The ID of the user making the request, used for authorization checks against the store's ownership.
   * @throws CustomError with status code 404 if the store, brand, or product type does not exist, or if a product with the same name already exists in the store. Throws CustomError with status code 409 for naming conflicts.
   * @returns The newly created product, including its variants and images.
   */
  async createProduct(data: CreateProductDTO, requesterId: string) {
    await validateStoreOwner(data.storeId, requesterId);

    const [existingBrand, existingProductType] = await Promise.all([
      prisma.brand.findUnique({
        where: { id: data.brandId, active: true },
      }),
      prisma.productType.findUnique({
        where: { id: data.productTypeId, active: true },
      }),
    ]);

    if (!existingBrand) {
      throw new CustomError({
        statusCode: 404,
        message: "The specified brand does not exist",
        errorCode: "NOT_FOUND",
        isOperational: true,
      });
    }
    if (!existingProductType) {
      throw new CustomError({
        statusCode: 404,
        message: "The specified product type does not exist",
        errorCode: "NOT_FOUND",
        isOperational: true,
      });
    }

    const existingProduct = await prisma.product.findFirst({
      where: { name: data.name, storeId: data.storeId },
    });

    if (existingProduct) {
      throw new CustomError({
        statusCode: 409,
        message: "A product with the same name already exists",
        errorCode: "CONFLICT",
        isOperational: true,
      });
    }

    const slug = `${data.name.toLowerCase().replace(/\s+/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;

    return await prisma.product.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        slug: slug,
        store: { connect: { id: data.storeId } },
        brand: { connect: { id: existingBrand.id } },
        type: { connect: { id: existingProductType.id } },
        variants: {
          create: data.variants.map((variant) => ({
            ...variant,
            stock: variant.stock ?? 0,
          })),
        },
        images: {
          create: data.images.map((img) => ({
            image: {
              create: {
                url: img.url,
                fileId: img.fileId,
              },
            },
          })),
        },
      },
      include: {
        variants: true,
        images: {
          include: { image: true },
        },
      },
    });
  },
  /**
   * Function to update an existing product's details, including its name, description, brand, product type, variants, and images. Validates that the requester has authorization to manage the store the product belongs to, checks for the existence of the specified brand and product type (if being updated), and ensures that there are no naming conflicts with other products in the same store. Also validates that any variants or images being updated or deleted belong to the product. Performs all updates in a single transaction and handles deletion of images from ImageKit if necessary.
   * @param data - An object containing the updated details of the product (UpdateProductDTO src/schema/product.schema.ts)
   * @param requesterId - The ID of the user making the request, used for authorization checks against the store's ownership.
   * @throws CustomError with status code 404 if the product, store, brand, or product type does not exist, or if any variants or images being updated/deleted do not belong to the product. Throws CustomError with status code 409 for naming conflicts with other products in the same store.
   * @returns The updated product, including its variants and images.
   */
  async updateProduct(data: UpdateProductDTO, requesterId: string) {
    const existingProduct = await prisma.product.findUnique({
      where: { id: data.id },
      select: {
        id: true,
        name: true,
        storeId: true,
        images: {
          select: {
            imageId: true,
            image: { select: { fileId: true } },
          },
        },
        variants: { select: { id: true } },
      },
    });

    if (!existingProduct) {
      throw new CustomError({
        statusCode: 404,
        message: "Product not found",
        errorCode: "NOT_FOUND",
      });
    }

    await validateStoreOwner(existingProduct.storeId, requesterId);

    // Validate that the new name (if provided) does not conflict with another product in the same store
    if (data.name && data.name !== existingProduct.name) {
      const nameConflict = await prisma.product.findFirst({
        where: {
          name: data.name,
          storeId: existingProduct.storeId,
          NOT: { id: data.id },
        },
      });

      if (nameConflict) {
        throw new CustomError({
          statusCode: 409,
          message: "A product with the same name already exists in this store",
          errorCode: "CONFLICT",
        });
      }
    }

    const checks: Promise<void>[] = [];

    if (data.brandId) {
      checks.push(
        prisma.brand
          .findUnique({ where: { id: data.brandId, active: true } })
          .then((brand) => {
            if (!brand)
              throw new CustomError({
                statusCode: 404,
                message: "The specified brand does not exist",
                errorCode: "NOT_FOUND",
              });
          }),
      );
    }

    if (data.productTypeId) {
      checks.push(
        prisma.productType
          .findUnique({ where: { id: data.productTypeId, active: true } })
          .then((productType) => {
            if (!productType)
              throw new CustomError({
                statusCode: 404,
                message: "The specified product type does not exist",
                errorCode: "NOT_FOUND",
              });
          }),
      );
    }

    if (checks.length) await Promise.all(checks);

    // Validate that variants to delete belong to the product
    if (data.variantsToDelete?.length) {
      const existingVariantIds = existingProduct.variants.map((v) => v.id);
      const invalidVariants = data.variantsToDelete.filter(
        (id) => !existingVariantIds.includes(id),
      );

      if (invalidVariants.length) {
        throw new CustomError({
          statusCode: 400,
          message: "Some variants do not belong to this product",
          errorCode: "VALIDATION_ERROR",
        });
      }
    }

    let fileIdsToDelete: string[] = [];

    // Validate that images to delete belong to the product and gather their file IDs for deletion from ImageKit
    if (data.imagesToDelete?.length) {
      const existingImageIds = existingProduct.images.map((pi) => pi.imageId);
      const invalidImages = data.imagesToDelete.filter(
        (id) => !existingImageIds.includes(id),
      );

      if (invalidImages.length) {
        throw new CustomError({
          statusCode: 400,
          message: "Some images do not belong to this product",
          errorCode: "VALIDATION_ERROR",
        });
      }

      const imagesToDelete = existingProduct.images.filter((pi) =>
        data.imagesToDelete!.includes(pi.imageId),
      );
      fileIdsToDelete = imagesToDelete.map((pi) => pi.image.fileId);
    }

    // Validate that variants to update belong to the product
    if (data.variants?.length) {
      const existingVariantIds = existingProduct.variants.map((v) => v.id);
      const invalidVariants = data.variants.filter(
        (v) => !existingVariantIds.includes(v.id),
      );

      if (invalidVariants.length) {
        throw new CustomError({
          statusCode: 400,
          message: "Some variants to update do not belong to this product",
          errorCode: "CONFLICT",
        });
      }
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      if (data.imagesToDelete?.length) {
        await tx.productImage.deleteMany({
          where: {
            productId: existingProduct.id,
            imageId: { in: data.imagesToDelete },
          },
        });
        await tx.image.deleteMany({
          where: { id: { in: data.imagesToDelete } },
        });
      }

      if (data.variantsToDelete?.length) {
        await tx.productVariant.deleteMany({
          where: {
            id: { in: data.variantsToDelete },
            productId: existingProduct.id,
          },
        });
      }

      if (data.variants?.length) {
        await Promise.all(
          data.variants.map(({ id: variantId, ...variantFields }) =>
            tx.productVariant.update({
              where: { id: variantId, productId: existingProduct.id },
              data: {
                ...(variantFields.name !== undefined && {
                  name: variantFields.name,
                }),
                ...(variantFields.price !== undefined && {
                  price: variantFields.price,
                }),
                ...(variantFields.stock !== undefined && {
                  stock: variantFields.stock,
                }),
              },
            }),
          ),
        );
      }

      return tx.product.update({
        where: { id: existingProduct.id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.brandId && { brand: { connect: { id: data.brandId } } }),
          ...(data.productTypeId && {
            type: { connect: { id: data.productTypeId } },
          }),
          ...(data.imagesToAdd?.length && {
            images: {
              create: data.imagesToAdd.map((img) => ({
                image: {
                  create: { url: img.url, fileId: img.fileId },
                },
              })),
            },
          }),
          ...(data.variantsToAdd?.length && {
            variants: {
              createMany: {
                data: data.variantsToAdd.map((variant) => ({
                  name: variant.name,
                  price: variant.price,
                  stock: variant.stock ?? 0,
                })),
              },
            },
          }),
        },
        include: {
          variants: true,
          images: { include: { image: true } },
        },
      });
    });

    if (fileIdsToDelete.length) {
      const results = await Promise.allSettled(
        fileIdsToDelete.map((fileId) => deleteImage(fileId)),
      );

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          Sentry.captureMessage("Failed to delete image from ImageKit", {
            level: "warning",
            extra: {
              fileId: fileIdsToDelete[index],
              reason: result.reason,
              productId: existingProduct.id,
              storeId: existingProduct.storeId,
            },
          });
        }
      });
    }

    return updatedProduct;
  },
  /**
   * Function to delete a product. Validates that the requester has authorization to manage the store the product belongs to. If the product has associated bill details, it is soft-deleted by setting its active flag to false. If there are no associated bill details, the product is hard-deleted along with its variants and images in a single transaction. Also handles deletion of images from ImageKit if necessary.
   * @param productId - The ID of the product to be deleted.
   * @param requesterId - The ID of the user making the request, used for authorization checks against the store's ownership.
   * @throws CustomError with status code 404 if the product is not found or if the requester is not authorized to manage the store.
   * @returns A string indicating whether the product was "soft-deleted" or "hard-deleted".
   */
  async deleteProduct(productId: string, requesterId: string) {
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        storeId: true,
        billDetails: { select: { id: true }, take: 1 },
        images: {
          select: { imageId: true, image: { select: { fileId: true } } },
        },
      },
    });

    if (!existingProduct) {
      throw new CustomError({
        errorCode: "NOT_FOUND",
        statusCode: 404,
        message: "Product not found",
      });
    }

    await validateStoreAuth(existingProduct.storeId, requesterId);

    if (existingProduct.billDetails.length > 0) {
      await prisma.product.update({
        where: { id: productId },
        data: { active: false },
      });
      return "soft-deleted";
    } else {
      const fileIdsToDelete = existingProduct.images.map(
        (pi) => pi.image.fileId,
      );
      const imageIds = existingProduct.images.map((pi) => pi.imageId);

      await prisma.$transaction([
        prisma.productVariant.deleteMany({ where: { productId } }),
        prisma.productImage.deleteMany({ where: { productId } }),
        prisma.image.deleteMany({
          where: { id: { in: imageIds } },
        }),
        prisma.product.delete({ where: { id: productId } }),
      ]);

      if (fileIdsToDelete.length) {
        const results = await Promise.allSettled(
          fileIdsToDelete.map((fileId) => deleteImage(fileId)),
        );

        results.forEach((result, index) => {
          if (result.status === "rejected") {
            Sentry.captureMessage("Failed to delete image from ImageKit", {
              level: "warning",
              extra: {
                fileId: fileIdsToDelete[index],
                reason: result.reason,
                productId: existingProduct.id,
                storeId: existingProduct.storeId,
              },
            });
          }
        });
      }

      return "hard-deleted";
    }
  },
  /**
   * Retrieves a product by its ID, including its associated brand, product type, variants and images. This function is used to display detailed information about a product, such as on a product details page.
   * @param productId - The ID of the product to retrieve.
   * @throws CustomError with status code 404 if the product is not found.
   * @returns The product with the specified ID, including its associated brand, product type, variants, and images.
   */
  async getProductById(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        brand: true,
        type: true,
        variants: true,
        images: {
          include: { image: true },
        },
      },
    });
    if (!product) {
      throw new CustomError({
        errorCode: "NOT_FOUND",
        statusCode: 404,
        message: "Product not found",
      });
    }
    return product;
  },
  /**
   * Retrieves all active products for a given store ID. This function is used to display the product catalog for a store, ensuring that only products that are currently active (not soft-deleted) are returned.
   * @param storeId - The ID of the store for which to retrieve products.
   * @throws CustomError with status code 404 if the store does not exist.
   * @returns An array of products belonging to the specified store that are marked as active. Each product includes its associated brand, product type, variants, and images.
   */
  async getProductsByStoreId(storeId: string) {
    const storeExists = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!storeExists) {
      throw new CustomError({
        errorCode: "NOT_FOUND",
        statusCode: 404,
        message: "Store not found",
      });
    }

    const products = await prisma.product.findMany({
      where: { storeId, active: true },
      include: {
        images: {
          include: { image: true },
        },
        brand: true,
        type: true,
        variants: true,
      },
    });
    return products;
  },
};
