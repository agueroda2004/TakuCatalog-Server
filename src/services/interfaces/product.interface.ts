import type { PaginatedResponse } from "../../types/pagination";
import type {
  CreateProductPayload,
  GetProductsByStoreQuery,
  Product,
  UpdateProductPayload,
} from "../../types/product";

/**
 * Contract for the Product service. The implementation lives in
 * `services/productNew.service.ts` and is the single place where business
 * rules (ownership checks, name conflicts, minimum-one-active-variant, hybrid
 * hard/soft delete) are applied. See `server/docs/PRODUCT.md`.
 */
export interface IProductService {
  /**
   * Creates a product. Validates store ownership, name uniqueness within the
   * store, and that the product type and sub-category belong to the store.
   */
  createProduct(data: CreateProductPayload, requesterId: string): Promise<void>;

  /**
   * Updates a product. Validates ownership, name uniqueness (only when the
   * name changes), consistency of `(productTypeId, subCategoryId)`, that all
   * variant ids belong to the product, and that the final state still has at
   * least one active variant. Splits `variantsToDelete` into hard/soft based
   * on each variant's `billDetailsCount`.
   */
  updateProduct(
    data: UpdateProductPayload,
    requesterId: string,
  ): Promise<void>;

  /**
   * Returns a paginated list of products in a store with all variants
   * (active + inactive). The client filters by `active` for display.
   */
  getProductsByStore(
    storeId: string,
    filters: GetProductsByStoreQuery,
  ): Promise<PaginatedResponse<Product>>;

  /**
   * Hard-deletes a product. Blocked (409) if the product has any
   * `BillDetail` rows — historical bills must remain referentially intact.
   */
  deleteProduct(productId: string, requesterId: string): Promise<void>;
}
