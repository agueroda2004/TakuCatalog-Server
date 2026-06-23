import { z } from "zod";
import type { ProductTypeSchema } from "../schemas/productType.schema";

export type CreateProductTypeDTO = z.infer<
  typeof ProductTypeSchema.createProductType
>["body"];

export type UpdateProductTypeParams = z.infer<
  typeof ProductTypeSchema.updateProductType
>["params"];

export type UpdateProductTypeDTO = z.infer<
  typeof ProductTypeSchema.updateProductType
>["body"];

export type DeleteProductTypeParams = z.infer<
  typeof ProductTypeSchema.deleteProductType
>["params"];

export type GetProductTypesByStoreParams = z.infer<
  typeof ProductTypeSchema.getProductTypeByStore
>["params"];

export type GetProductTypesByStoreQuery = z.infer<
  typeof ProductTypeSchema.getProductTypeByStore
>["query"];

export type GetProductTypesByStoreDropdownParams = z.infer<
  typeof ProductTypeSchema.getProductTypesForDropdown
>["params"];

export type ProductType = {
  id: string;
  name: string;
  active: boolean;
  _count: {
    products: number;
  };
};

export type updateProductTypeData = {
  name?: string;
  active?: boolean;
};
