import prisma from "../lib/prisma";
import type { CreateProductPayload } from "../types/product";
import type { IProductRepository } from "./interfaces/product.interface";

export class ProductRepository implements IProductRepository {
  async createProduct(data: CreateProductPayload) {
    await prisma.product.create({
      data: {
        name: data.name,
        description: data.description ? data.description : null,
        storeId: data.storeId,
        productTypeId: data.productTypeId,
        subCategoryId: data.subCategoryId,
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
  async findProductById(productId: string) {
    return await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
      },
    });
  }
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
}
