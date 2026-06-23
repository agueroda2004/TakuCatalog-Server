import { z } from "zod";
import type { SubCategorySchema } from "../schemas/subcategory.schema";

export type CreateSubCategoryDTO = z.infer<
  typeof SubCategorySchema.createSubCategory
>["body"];

export type GetSubCategoriesByStoreParams = z.infer<
  typeof SubCategorySchema.getSubCategoriesByStore
>["params"];

export type GetSubCategoriesByStoreQuery = z.infer<
  typeof SubCategorySchema.getSubCategoriesByStore
>["query"];

export type UpdateSubCategoryDTO = z.infer<
  typeof SubCategorySchema.updateSubCategory
>["body"];

export type UpdateSubCategoryParams = z.infer<
  typeof SubCategorySchema.updateSubCategory
>["params"];

export type DeleteSubCategoryParams = z.infer<
  typeof SubCategorySchema.deleteSubCategory
>["params"];

export type SubCategory = {
  id: string;
  name: string;
  active: boolean;
  productTypeId: string;
  _count: {
    products: number;
  };
};
