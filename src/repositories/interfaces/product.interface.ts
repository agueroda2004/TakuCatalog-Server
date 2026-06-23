import type { CreateProductPayload } from "../../types/product";

export interface IProductRepository {
  createProduct(data: CreateProductPayload): Promise<void>;
  findProductById(productId: string): Promise<{ id: string } | null>;
  findProductByNameAndStoreId(
    name: string,
    storeId: string,
  ): Promise<{ id: string } | null>;
}
