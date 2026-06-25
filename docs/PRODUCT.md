# Product Feature — Architecture

This document describes the architecture, design decisions, and data flows of the Product feature. Use it as the entry point when onboarding or revisiting the code after time away.

## Overview

The Product feature lets a store owner manage their catalog of products and product variants. Each product belongs to a store, has one image, one product type, one sub-category, and one or more variants (each with a name, price, and optional stock).

The feature is split across the codebase following the repository pattern:

```
Route → Controller → Service → Repository → Prisma → MySQL
                          ↓
                       (cross-repo: ProductTypeRepository, SubCategoryRepository)
                          ↓
                       ImageKit (image storage)
```

## File map

| Layer                  | File                                               | Responsibility                                       |
| ---------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| Schema (Zod)           | `src/schemas/product.schema.ts`                    | Request body / params validation                     |
| Types                  | `src/types/product.d.ts`                           | Shared TypeScript types (DTOs, entities)             |
| Interface (service)    | `src/services/interfaces/product.interface.ts`     | Service contract                                     |
| Service                | `src/services/productNew.service.ts`               | Business rules, validation, orchestration            |
| Interface (repository) | `src/repositories/interfaces/product.interface.ts` | Repository contract                                  |
| Repository             | `src/repositories/product.repository.ts`           | DB access only (Prisma calls + transactions)         |
| Controller             | `src/controllers/productNew.controller.ts`         | HTTP layer (req/res)                                 |
| Route                  | `src/routes/productNew.route.ts`                   | Express routes + middleware wiring                   |
| Schema (Prisma)        | `prisma/schema.prisma`                             | DB models (see `Product`, `ProductVariant`, `Image`) |

## Endpoints

All routes require authentication (`requireAuth` middleware) and are mounted under the parent router as `/product` (see `routes/productNew.route.ts`).

| Method   | Path              | Controller           | Validates                              | Mutates                                            |
| -------- | ----------------- | -------------------- | -------------------------------------- | -------------------------------------------------- |
| `POST`   | `/`               | `createProduct`      | `CreateProductSchema`                  | `Product` + `Image` + `ProductVariant[]`           |
| `PATCH`  | `/:id`            | `updateProduct`      | `UpdateProductSchema`                  | `Product` + optionally `Image`, `ProductVariant[]` |
| `DELETE` | `/:id`            | `deleteProduct`      | `ProductSchema.deleteProduct` (params) | `Product` (cascade or block)                       |
| `GET`    | `/store/:storeId` | `getProductsByStore` | `ProductSchema.getProductsByStore`     | none                                               |

All write endpoints return `204 No Content`. The list endpoint returns `200 OK` with `{ data: { items, pagination } }`.

## Key entities

### `Product` (`types/product.d.ts`)

The catalog entry. Fields:

- `id`, `name` (string, unique per store)
- `description` (`string | null`)
- `active` (boolean — soft delete flag; variants' visibility is independent)
- `productTypeId`, `subCategoryId` — FK to the product type and sub-category
- `image` (`{ url, fileId } | null`) — exactly one image (one-to-one)
- `variants` (`ProductVariant[]`) — one-to-many

### `ProductVariant` (`types/product.d.ts`)

A purchasable variant of a product. Fields:

- `id`, `name`, `price` (`Decimal` in DB, `number` in JSON)
- `stock` (`number | null`) — **null means the store does not manage its own stock** (the merchant queries stock from an external system). A value of `0` means explicitly out of stock.
- `active` (boolean) — soft delete flag
- `hasBillDetails` (boolean) — used to decide hard vs soft delete (see below). Computed via `take: 1` for performance — see the "Performance note" in this doc.

### Image

A product has exactly **one** image (one-to-one relation via `Image.productId @unique`). The image is stored in ImageKit (URL + fileId) and referenced from the `Image` table. Replacing the image in an update deletes the old Image record and creates a new one in a single transaction; the old ImageKit file is deleted after the DB transaction commits (best-effort, errors logged via Sentry).

## Design decisions

### Hybrid hard/soft delete for variants (the most important one)

`ProductVariant` cannot be hard-deleted when `BillDetail` records reference it: the FK has no `onDelete` clause, which in Prisma defaults to `Restrict` (DB rejects the delete). To preserve historical bills, the service uses a **hybrid** strategy:

| Scenario                     | Behavior                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Variant has 0 `billDetails`  | **Hard delete** — `prisma.productVariant.deleteMany(...)`                         |
| Variant has ≥1 `billDetails` | **Soft delete** — `prisma.productVariant.updateMany({ data: { active: false } })` |

The split happens in the **service** (`updateProduct`), based on `findProductForUpdate` which returns each variant's `billDetailsCount`. The repository just executes the two prepared arrays.

**Implication for clients:** when listing products, the list query returns **all variants** (active and inactive). The client must filter by `active` for display. Inactive variants are shown in the edit form with an "Inactive" badge and can be reactivated.

### `active` flag on `ProductVariant`

Introduced via migration. Lets us:

- Hide variants from the catalog without losing bill history
- Support a future "show/hide variants" feature on a product detail page

`ProductVariant.active` is independent of `Product.active` — a product can be active while some of its variants are inactive (or vice-versa).

### Minimum-one-active-variant invariant

Every product must always have at least **one active variant** after any update. Enforced in **two layers**:

1. **Service (`updateProduct`):** after resolving the final set of variants (existing minus deleted, plus added, plus reactivated), counts active ones. Throws `400 "A product must have at least one variant"` if `< 1`.
2. **Client (`EditForm.tsx`):** the delete button for a variant is disabled when it would leave the product with 0 active variants.

### Stock `null` vs `0`

`stock: null` and `stock: 0` have different meanings:

- `null` — the store does not manage its own stock (external system)
- `0` — explicitly out of stock

Both `createProduct` and `updateProduct` translate an undefined client-side stock into `null`. **Do not change `?? null` to `?? 0`** — it breaks the contract.

### Image management

- Image uploads are handled **client-side** via ImageKit. The server only stores the resulting `url` + `fileId`.
- On replace (`PATCH` with `image` field): the service performs the DB updates in a transaction, then deletes the **old** ImageKit file after the transaction commits. Failures are logged via Sentry but don't roll back the DB change (best-effort).
- An orphaned image (uploaded but the form is closed without submitting) is cleaned up by the client.

### Name conflict detection (update)

The `updateProduct` method checks for a name conflict **only when the name actually changes**. It reuses `findProductByNameAndStoreId` and excludes the current product's id from the match check, so renaming a product to its current name does not trigger a conflict.

### `productTypeId` / `subCategoryId` consistency

The service computes a "final" pair (`finalProductTypeId`, `finalSubCategoryId`) from `data.productTypeId ?? existing.productTypeId` (and same for sub-category), then validates the combination. This ensures that:

- If only the sub-category changes, it must belong to the **current** product type
- If both change, the new sub-category must belong to the **new** product type
- If only the product type changes, the **existing** sub-category must belong to the new product type (otherwise we'd silently create an inconsistent state)

## Typical request flows

### Create product

```
Client                    Controller              Service                   Repository                Prisma
  │                            │                        │                          │                       │
  │── POST /product ──────────>│                        │                          │                       │
  │                            │── validateSchema ────> │                          │                       │
  │                            │   (CreateProductSchema)│                          │                       │
  │                            │── service.create ─────>│                          │                       │
  │                            │                        │── validateStoreOwner ───>│                       │
  │                            │                        │── findByName ───────────>│                       │
  │                            │                        │── validateProductType ──>│                       │
  │                            │                        │── validateSubCategory ──>│                       │
  │                            │                        │── create (transaction) ─>│── INSERT ────────────>│
  │<── 204 ────────────────────│<───────────────────────│<─────────────────────────│<──────────────────────│
```

### Update product (with image replace + variant delete + variant add)

```
Client                    Service                      Repository                      Prisma
  │                          │                               │                              │
  │── PATCH /product/:id ──> │                               │                              │
  │                          │── findProductForUpdate ─────> │── SELECT (with billDetails) >│
  │                          │<─ { variants, imageFileId }─  │<─────────────────────────────│
  │                          │                               │                              │
  │                          │── validateStoreOwner          │                              │
  │                          │── name conflict check         │                              │
  │                          │── productType / subCategory   │                              │
  │                          │   validation                  │                              │
  │                          │── variants belong check       │                              │
  │                          │── compute final active count  │                              │
  │                          │── split delete: hard/soft ───>│                              │
  │                          │   based on billDetails        │                              │
  │                          │                               │                              │
  │                          │── update (transaction) ──────>│                              │
  │                          │                               │── deleteMany(variantsToHard) │
  │                          │                               │── updateMany(active=false)   │
  │                          │                               │── update(variantsToUpdate)   │
  │                          │                               │── update(product fields)     │
  │                          │                               │── deleteMany(image old)      │
  │                          │                               │── create(image new)          │
  │                          │<─ { oldImageFileId } ──────── │<─────────────────────────────│
  │                          │                               │                              │
  │                          │── deleteImage(oldFileId) ───> │ (ImageKit, best-effort)      │
  │<─ 204 ────────────────── │                               │                              │
```

### Delete product

```
Client                    Service                      Repository                      Prisma
  │                          │                              │                              │
  │── DELETE /product/:id ─> │                              │                              │
  │                          │── findProductForDeletion ───>│── SELECT (limit 1 bills) ──> │
  │                          │<─ { hasBillDetails } ────────│<─────────────────────────────│
  │                          │                              │                              │
  │                          │── validateStoreOwner         │                              │
  │                          │── if hasBillDetails: 409     │                              │
  │                          │                              │                              │
  │                          │── delete (transaction) ─────>│                              │
  │                          │                              │── deleteMany(variants)       │
  │                          │                              │── deleteMany(images)         │
  │                          │                              │── delete(product)            │
  │                          │<─ { oldImageFileId } ────────│<─────────────────────────────│
  │                          │                              │                              │
  │                          │── deleteImage(oldFileId) ───>│ (ImageKit, best-effort)      │
  │<─ 204 ────────────────── │                              │                              │
```

## Error codes

| Code | Meaning                                                                                                                                 | Source                            |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 400  | Validation error (e.g. invalid UUID, min/max on name, variant IDs don't belong to product, product would end up with 0 active variants) | Zod (`validateSchema`) or service |
| 403  | Requester is not the owner of the store                                                                                                 | `validateStoreOwner`              |
| 404  | Product / store / product type / sub-category not found, or doesn't belong to the requester's store                                     | service                           |
| 409  | Product with the same name already exists in this store                                                                                 | service (create/update)           |
| 409  | Cannot delete a product that has associated bill details                                                                                | service (delete)                  |
| 500  | Unexpected server error                                                                                                                 | error middleware                  |

## Testing considerations (future)

When adding tests for this feature, focus on:

- `updateProduct` split logic: variants with bills go to soft delete, without bills go to hard delete
- `updateProduct` minimum-one-active-variant invariant
- `findProductForUpdate` returns all variants (active + inactive) with `_count.billDetails`
- `getProductsByStore` returns variants regardless of `active` (client filters)
- Name conflict check excludes the current product on update

## Related files

- `src/utils/storeAuth.ts` — `validateStoreOwner(storeId, requesterId)` shared helper
- `src/lib/imagekit.ts` — `deleteImage(fileId)` for ImageKit cleanup
- `src/lib/prisma.ts` — singleton Prisma client
- `prisma/schema.prisma` — DB models and relations
