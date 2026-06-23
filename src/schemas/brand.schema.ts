import { z } from "zod";

export const brandSchema = {
  createBrand: z.object({
    body: z.object({
      name: z
        .string()
        .min(2, "Name must be at least 2 characters long")
        .max(255, "Name must be at most 255 characters long"),
      storeId: z.string().uuid("Invalid Store ID format"),
    }),
  }),
  updateBrand: z.object({
    body: z.object({
      name: z
        .string({ error: "Name is required" })
        .min(2, "Name must be at least 2 characters long")
        .max(255, "Name must be at most 255 characters long")
        .optional(),
    }),
    params: z.object({
      id: z
        .string({ error: "Brand ID is required" })
        .uuid("Invalid brand ID format"),
    }),
  }),
  deleteBrand: z.object({
    params: z.object({
      id: z
        .string({ error: "Brand ID is required" })
        .uuid("Invalid brand ID format"),
    }),
  }),
};

export type CreateBrandDTO = z.infer<typeof brandSchema.createBrand>["body"];
export type UpdateBrandDTO = z.infer<typeof brandSchema.updateBrand>["body"] &
  z.infer<typeof brandSchema.updateBrand>["params"];
