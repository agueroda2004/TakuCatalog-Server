export interface IProductTypeRepository {
  validateProductType(
    productTypeId: string,
    storeId: string,
  ): Promise<{ id: string } | null>;
}
