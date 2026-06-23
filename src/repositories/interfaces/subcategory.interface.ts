export interface ISubCategoryRepository {
  validateSubCategory(
    subCategoryId: string,
    storeId: string,
    productTypeId: string,
  ): Promise<{ id: string } | null>;
}
