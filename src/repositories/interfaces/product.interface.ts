import type {
  CreateProductPayload,
  UpdateProductPayload,
} from "../../types/product";

/**
 * Contract for the Product repository. Pure data access — implementations
 * must not contain business rules. See `server/docs/PRODUCT.md` for the
 * overall design and `repositories/product.repository.ts` for semantics.
 */
export interface IProductRepository {
  /**
   * Creates a product with its image and initial variants in a single Prisma
   * transaction.
   */
  createProduct(data: CreateProductPayload): Promise<void>;

  /** Returns `{ id }` or null. Cheap existence/projection lookup. */
  findProductById(productId: string): Promise<{ id: string } | null>;

  /**
   * Returns the id of the first product in a store with the given name,
   * or null. Used by the service for name-conflict checks.
   */
  findProductByNameAndStoreId(
    name: string,
    storeId: string,
  ): Promise<{ id: string } | null>;

  /**
   * Returns the minimum data needed to validate a product delete:
   * store id (for ownership), `hasBillDetails` (blocks delete), and the
   * current image's ImageKit fileId (for cleanup).
   */
  findProductForDeletion(productId: string): Promise<{
    storeId: string;
    hasBillDetails: boolean;
    imageFileId: string | null;
  } | null>;

  /**
   * Hard-deletes a product, its variants, and its image in a transaction.
   * ImageKit cleanup happens in the service after this returns.
   */
  deleteProduct(productId: string): Promise<void>;

  /**
   * Returns the full data needed by `updateProduct` validation:
   * identifying + ownership fields, FKs, the full variant list with
   * `hasBillDetails` boolean (computed via `take: 1` for performance), and
   * the current image fileId.
   */
  findProductForUpdate(productId: string): Promise<{
    storeId: string;
    name: string;
    productTypeId: string;
    subCategoryId: string;
    variants: {
      id: string;
      name: string;
      price: number;
      stock: number | null;
      active: boolean;
      hasBillDetails: boolean;
    }[];
    imageFileId: string | null;
  } | null>;

  /**
   * Applies a product update inside a single Prisma transaction. The service
   * is responsible for splitting `variantsToDelete` into
   * `variantsToHardDelete` and `variantsToSoftDelete` based on each variant's
   * `hasBillDetails` flag.
   *
   * Returns the previous image's ImageKit fileId so the service can delete
   * it after the transaction commits.
   */
  updateProduct(data: UpdateProductPayload): Promise<{
    oldImageFileId: string | null;
  }>;
}
