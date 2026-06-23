import { z } from "zod";

export const SubCategorySchema = {
  createSubCategory: z.object({
    body: z.object({
      name: z
        .string({ error: "Name is required" })
        .min(2, "Name must be at least 2 characters long")
        .max(255, "Name must be at most 255 characters long"),
      storeId: z
        .string({ error: "Store ID is required" })
        .uuid("Invalid Store ID format"),
      productTypeId: z
        .string({ error: "Product Type ID is required" })
        .uuid("Invalid Product Type ID format"),
    }),
  }),
  updateSubCategory: z.object({
    body: z.object({
      name: z
        .string({ error: "Name is required" })
        .min(2, "Name must be at least 2 characters long")
        .max(255, "Name must be at most 255 characters long")
        .optional(),
      active: z.boolean().optional(),
    }),
    params: z.object({
      id: z.string({ error: "SubCategory ID is required" }),
      storeId: z.string({ error: "Store ID is required" }),
    }),
  }),
  deleteSubCategory: z.object({
    params: z.object({
      id: z.string({ error: "SubCategory ID is required" }),
      storeId: z.string({ error: "Store ID is required" }),
    }),
  }),

  getSubCategoriesByStore: z.object({
    params: z.object({
      storeId: z.string({ error: "Store ID is required" }),
    }),
    query: z.object({
      productTypeId: z.string().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().default(10),
      search: z.string().optional(),
      status: z.enum(["active", "inactive", "all"]).optional(),
    }),
  }),

  getSubCategoriesForDropdown: z.object({
    params: z.object({
      storeId: z.string({ error: "Store ID is required" }),
    }),
    query: z.object({
      productTypeId: z
        .string()
        .uuid("Invalid Product Type ID format")
        .optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().default(10),
      search: z.string().optional(),
      status: z.enum(["active", "inactive", "all"]).optional(),
    }),
  }),
};
