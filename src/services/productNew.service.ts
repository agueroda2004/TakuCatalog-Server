import ApiErrorResponse from "../errors/apiErrorResponse";
import { ProductRepository } from "../repositories/product.repository";
import type { ProductTypeRepository } from "../repositories/productType.repository";
import type { SubCategoryRepository } from "../repositories/subcategory.repository";
import type { CreateProductPayload } from "../types/product";
import { validateStoreOwner } from "../utils/storeAuth";
import type { IProductService } from "./interfaces/product.interface";

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
}
