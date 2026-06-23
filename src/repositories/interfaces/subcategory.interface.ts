import type {
  CreateSubCategoryPayload,
  UpdateSubCategoryPayload,
} from "../../types/subcategory";

export interface ISubCategoryRepository {
  createSubCategory(data: CreateSubCategoryPayload): Promise<void>;

  updateSubCategory(
    subCategoryId: string,
    data: UpdateSubCategoryPayload,
  ): Promise<void>;

  deleteSubCategory(subCategoryId: string, storeId: string): Promise<void>;

  validateSubCategoryInStoreAndProductType(
    subCategoryId: string,
    storeId: string,
    productTypeId: string,
  ): Promise<{ id: string } | null>;

  validateSubCategoryInStore(
    subCategoryId: string,
    storeId: string,
  ): Promise<{ id: string; productTypeId: string; name: string } | null>;

  validateSubCategoryName(
    name: string,
    storeId: string,
    productTypeId: string,
  ): Promise<{ id: string } | null>;

  validateSubCategoryHasRecords(
    subCategoryId: string,
    storeId: string,
  ): Promise<{ products: { id: string }[] } | null>;
}
