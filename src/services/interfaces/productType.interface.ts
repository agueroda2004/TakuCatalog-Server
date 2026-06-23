import type { PaginatedResponse } from "../../types/pagination";
import type {
  CreateProductTypeDTO,
  UpdateProductTypeDTO,
  ProductType,
  GetProductTypesByStoreQuery,
} from "../../types/productType";

export interface IProductTypeService {
  createProductType(
    data: CreateProductTypeDTO,
    requesterId: string,
  ): Promise<void>;

  updateProductType(
    id: string,
    storeId: string,
    data: UpdateProductTypeDTO,
    requesterId: string,
  ): Promise<void>;

  deleteProductType(
    id: string,
    storeId: string,
    requesterId: string,
  ): Promise<void>;

  getProductTypesByStore(
    storeId: string,
    filters: GetProductTypesByStoreQuery,
  ): Promise<PaginatedResponse<ProductType>>;

  getProductTypesByStoreDropdown(
    storeId: string,
  ): Promise<{ id: string; name: string }[]>;
}
