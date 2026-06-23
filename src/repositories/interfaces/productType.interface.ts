import type {
  CreateProductTypePayload,
  UpdateProductTypePayload,
} from "../../types/productType";

export interface IProductTypeRepository {
  createProductType(data: CreateProductTypePayload): Promise<{ id: string }>;
  updateProductType(
    productTypeId: string,
    data: UpdateProductTypePayload,
  ): Promise<void>;

  deleteProductType(productTypeId: string, storeId: string): Promise<void>;

  validateProductTypeInStore(
    productTypeId: string,
    storeId: string,
  ): Promise<{ id: string; name: string } | null>;

  validateProductTypeName(
    name: string,
    storeId: string,
  ): Promise<{ id: string } | null>;

  validateProductTypeHasRecords(
    productTypeId: string,
    storeId: string,
  ): Promise<{
    products: { id: string }[];
    subCategories: { id: string }[];
  } | null>;
}
