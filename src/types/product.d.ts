import { z } from "zod";
import type { ProductSchema, UpdateProductSchema } from "../schemas/product.schema";

/**
 * Payload for `POST /product` (create). Includes the FK fields, the new image
 * (already uploaded to ImageKit by the client), and the initial variants.
 * `storeId` is required so the service can validate ownership.
 */
export type CreateProductPayload = {
  name: string;
  description?: string;
  storeId: string;
  productTypeId: string;
  subCategoryId: string;

  // Image creation
  image: {
    url: string;
    fileId: string;
  };

  // Product Variants creation
  variants: {
    name: string;
    price: number;
    /** `undefined` is stored as `null` (see `ProductVariant.stock` semantics). */
    stock?: number;
  }[];
};

/**
 * Payload for `PATCH /product/:id` (update). Every field except `id` is
 * optional. The client sends three variant arrays:
 *
 * - `variantsToAdd`: new variants to create (always `active = true`).
 * - `variantsToUpdate`: existing variants to patch. Only defined fields are
 *   applied; `active: true` is used to reactivate a previously soft-deleted
 *   variant.
 * - `variantsToDelete`: existing variants to remove. The service splits this
 *   into `variantsToHardDelete` (no bills → true removal) and
 *   `variantsToSoftDelete` (has bills → `active = false`).
 *
 * The two `variantsToHardDelete` / `variantsToSoftDelete` fields are
 * **internal**: the service fills them based on each variant's
 * `hasBillDetails` flag and the repository uses them. The client never sets
 * them directly.
 */
export type UpdateProductPayload = {
  id: string;
  name?: string;
  description?: string;
  productTypeId?: string;
  subCategoryId?: string;

  // New image to replace the current one (already uploaded to ImageKit)
  image?: {
    url: string;
    fileId: string;
  };

  variantsToAdd?: {
    name: string;
    price: number;
    /** `undefined` is stored as `null` (see `ProductVariant.stock` semantics). */
    stock?: number;
  }[];
  variantsToUpdate?: {
    id: string;
    name?: string;
    price?: number;
    stock?: number;
    /** Set to `true` to reactivate a previously soft-deleted variant. */
    active?: boolean;
  }[];
  variantsToDelete?: string[];

  // Internal: populated by the service after splitting variantsToDelete
  // based on whether each variant has associated billDetails.
  variantsToHardDelete?: string[];
  variantsToSoftDelete?: string[];
};

export type GetProductsByStoreParams = z.infer<
  typeof ProductSchema.getProductsByStore
>["params"];

export type DeleteProductParams = z.infer<
  typeof ProductSchema.deleteProduct
>["params"];

export type UpdateProductParams = z.infer<
  typeof UpdateProductSchema
>["params"];

/**
 * Query string accepted by `GET /product/store/:storeId`. All fields are
 * optional; the service applies sensible defaults (e.g. `page = 1`,
 * `limit = 10`).
 */
export type GetProductsByStoreQuery = {
  page?: number;
  limit?: number;
  productTypeId?: string;
  subCategoryId?: string;
  status?: "active" | "inactive" | "all";
  search?: string;
};

/**
 * Product variant as returned to the client. Notes:
 *
 * - `price` is a JS `number` (the DB stores `Decimal`, converted in the
 *   repository).
 * - `stock: null` means the store does **not** manage its own stock (the
 *   merchant queries stock from an external system). `0` means explicitly
 *   out of stock. See docs/PRODUCT.md.
 * - `active = false` is the soft-delete flag — a variant that has been
 *   "removed" from the catalog but still has historical bill references.
 * - `hasBillDetails` is a boolean computed via `take: 1` (early termination
 *   at the first row) instead of a full COUNT. It's enough for the client
 *   to decide whether to show the "In use" badge, and for the server to
 *   decide between hard and soft delete on `updateProduct`. If the exact
 *   count is ever needed, it should be fetched lazily on demand.
 */
export type ProductVariant = {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  active: boolean;
  hasBillDetails: boolean;
};

/**
 * Product as returned to the client. `variants` includes both active and
 * inactive — the client filters by `active` to display only currently
 * visible variants.
 */
export type Product = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  productTypeId: string;
  subCategoryId: string;
  image: {
    url: string;
    fileId: string;
  } | null;
  variants: ProductVariant[];
};
