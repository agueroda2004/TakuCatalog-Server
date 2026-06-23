import { z } from "zod";

const STATUS_ENUM = ["PENDING", "PAID", "CANCELLED", "DELIVERED"] as const;

export const billSchema = {
  createBill: z.object({
    body: z.object({
      paidAt: z.string().datetime("Invalid date-time format").optional(),
      notes: z
        .string()
        .max(500, "Notes must be at most 500 characters long")
        .optional(),
      storeId: z.string().uuid("Invalid Store ID format"),
      customerName: z
        .string()
        .min(2, "Customer name must be at least 2 characters long")
        .max(255, "Customer name must be at most 255 characters long")
        .optional(),
      customerEmail: z
        .string()
        .email("Invalid email format")
        .max(255, "Customer email must be at most 255 characters long")
        .optional(),
      customerPhone: z
        .string()
        .max(20, "Customer phone must be at most 20 characters long")
        .optional(),
      customerAddress: z
        .string()
        .max(255, "Customer address must be at most 255 characters long")
        .optional(),
      products: z
        .array(
          z.object({
            productId: z.string().uuid("Invalid Product ID format"),
            productVariantId: z
              .string()
              .uuid("Invalid Product Variant ID format"),
            quantity: z
              .number()
              .positive({ error: "Quantity must be a positive number" }),
          }),
        )
        .min(1, "At least one product must be included in the bill"),
    }),
  }),
  changeStatusBill: z.object({
    body: z.object({
      status: z.enum(STATUS_ENUM, {
        error: "Status must be one of: PENDING, PAID, CANCELLED, DELIVERED",
      }),
    }),
    params: z.object({
      id: z.string().uuid("Invalid Bill ID format"),
    }),
  }),
};

export type CreateBillDTO = z.infer<typeof billSchema.createBill>["body"];
export type ChangeStatusBillDTO = z.infer<
  typeof billSchema.changeStatusBill
>["body"] &
  z.infer<typeof billSchema.changeStatusBill>["params"];
