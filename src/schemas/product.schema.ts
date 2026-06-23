import { z } from "zod";

export const ProductSchema = {
  createProduct: z.object({
    body: z.object({
      name: z
        .string()
        .min(2, "Name must be at least 2 characters long")
        .max(255, "Name must be at most 255 characters long"),
      storeId: z.string().uuid("Invalid Store ID format"),
      productTypeId: z.string().uuid("Invalid Product Type ID format"),
      brandId: z.string().uuid("Invalid Brand ID format"),
      description: z.optional(
        z
          .string()
          .max(1000, "Description must be at most 1000 characters long"),
      ),
      variants: z
        .array(
          z.object({
            name: z
              .string()
              .min(2, "Variant name must be at least 2 characters long")
              .max(255, "Variant name must be at most 255 characters long"),
            price: z
              .number()
              .positive("Price must be positive")
              .min(1, "Price must be at least 1")
              .max(1000000, "Price must be at most 1 000 000"),
            stock: z.optional(
              z
                .number()
                .int("Stock must be an integer")
                .positive("Stock must be positive")
                .max(1000000, "Stock must be at most 1 000 000"),
            ),
          }),
        )
        .min(1, "At least one variant is required"),
      images: z
        .array(
          z.object({
            url: z.string().url("Invalid URL format"),
            fileId: z.string().min(1, "File ID cannot be empty"),
          }),
        )
        .min(1, "At least one image is required"),
    }),
  }),
  updateProduct: z.object({
    body: z.object({
      name: z
        .string()
        .min(2, "Name must be at least 2 characters long")
        .max(255, "Name must be at most 255 characters long")
        .optional(),
      productTypeId: z
        .string()
        .uuid("Invalid Product Type ID format")
        .optional(),
      brandId: z.string().uuid("Invalid Brand ID format").optional(),
      description: z
        .string()
        .max(1000, "Description must be at most 1000 characters long")
        .optional(),
      variants: z
        .array(
          z.object({
            id: z.string().uuid("Invalid Variant ID format"),
            name: z
              .string()
              .min(2, "Variant name must be at least 2 characters long")
              .max(255, "Variant name must be at most 255 characters long")
              .optional(),
            price: z
              .number()
              .positive("Price must be positive")
              .min(1, "Price must be at least 1")
              .max(1000000, "Price must be at most 1 000 000")
              .optional(),
            stock: z.optional(
              z
                .number()
                .int("Stock must be an integer")
                .positive("Stock must be positive")
                .max(1000000, "Stock must be at most 1 000 000"),
            ),
          }),
        )
        .optional(),
      variantsToAdd: z
        .array(
          z.object({
            name: z
              .string()
              .min(2, "Variant name must be at least 2 characters long")
              .max(255, "Variant name must be at most 255 characters long"),
            price: z
              .number()
              .positive("Price must be positive")
              .min(1, "Price must be at least 1")
              .max(1000000, "Price must be at most 1 000 000"),
            stock: z.optional(
              z
                .number()
                .int("Stock must be an integer")
                .min(0, "Stock must be a positive number")
                .max(1000000, "Stock must be at most 1 000 000"),
            ),
          }),
        )
        .optional(),
      imagesToAdd: z
        .array(
          z.object({
            url: z.string().url("Invalid URL format"),
            fileId: z.string().min(1, "File ID cannot be empty"),
          }),
        )
        .optional(),
      variantsToDelete: z
        .array(z.string().uuid("Invalid Variant ID format"))
        .optional(),
      imagesToDelete: z
        .array(z.string().min(1, "FileId cannot be empty"))
        .optional(),
    }),
    params: z.object({
      id: z.string().uuid("Invalid Product ID format"),
    }),
  }),
  deleteProduct: z.object({
    params: z.object({
      id: z
        .string({ error: "Product ID is required" })
        .uuid("Invalid Product ID format"),
    }),
  }),
};

export const CreateProductSchema = z.object({
  body: z.object({
    name: z.string().nonempty("").min(2).max(255),
    description: z.string().max(255).optional(),
    storeId: z.string().nonempty(""),
    productTypeId: z.string().nonempty(""),
    subCategoryId: z.string().nonempty(""),
    image: z.object({
      url: z.string().nonempty(""),
      fileId: z.string().nonempty(""),
    }),
    variants: z
      .array(
        z.object({
          name: z.string().nonempty("").min(2).max(255),
          price: z.number().positive().min(1).max(1000000),
          stock: z.number().int().positive().max(1000000).optional(),
        }),
      )
      .min(1, "At least one variant is required"),
  }),
});

export type CreateProductDTO = z.infer<
  typeof ProductSchema.createProduct
>["body"];

export type UpdateProductDTO = z.infer<
  typeof ProductSchema.updateProduct
>["body"] &
  z.infer<typeof ProductSchema.updateProduct>["params"];
