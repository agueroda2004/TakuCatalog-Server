import { z } from "zod";

export const ProductTypeSchema = {
  createProductType: z.object({
    body: z.object({
      name: z
        .string({ error: "Name is required" })
        .min(2, "Name must be at least 2 characters long")
        .max(255, "Name must be at most 255 characters long"),
      storeId: z
        .string({ error: "Store ID is required" })
        .uuid("Invalid Store ID format"),
    }),
  }),
  updateProductType: z.object({
    body: z.object({
      name: z
        .string({ error: "Name is required" })
        .min(2, "Name must be at least 2 characters long")
        .max(255, "Name must be at most 255 characters long")
        .optional(),
      active: z.boolean().optional(),
    }),
    params: z.object({
      id: z
        .string({ error: "Product type ID is required" })
        .uuid("Invalid product type ID format"),
    }),
  }),
  deleteProductType: z.object({
    params: z.object({
      id: z
        .string({ error: "Product type ID is required" })
        .uuid("Invalid product type ID format"),
    }),
  }),
  getProductTypeByStore: z.object({
    params: z.object({
      storeId: z.string({ error: "Store ID is required" }),
    }),
    query: z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().default(10),
      search: z.string().optional(),
      status: z.enum(["active", "inactive", "all"]).optional(),
    }),
  }),
  getProductTypesForDropdown: z.object({
    params: z.object({
      storeId: z.string({ error: "Store ID is required" }),
    }),
  }),
};

export type CreateProductTypeDTO = z.infer<
  typeof ProductTypeSchema.createProductType
>["body"];
