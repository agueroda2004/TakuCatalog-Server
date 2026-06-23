import { z } from "zod";

const phoneRegex = /^[\d-]+$/;
const socialMediaRegex = /^(@?[a-zA-Z0-9._-]+)$/;
const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const StoreSchema = {
  createStore: z.object({
    body: z.object({
      name: z
        .string()
        .nonempty({ message: "Name is required" })
        .min(2, "Name must be at least 2 characters long")
        .max(255, "Name must be at most 255 characters long"),
      currencyCode: z.string().nonempty({ message: "Currency is required" }),
      countryCode: z.string().nonempty({ message: "Country code is required" }),
      language: z.string().nonempty({ message: "Language is required" }),
      color: z
        .string({ error: "Color is required" })
        .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
      phoneNumber: z
        .string()
        .nonempty({ message: "Phone number is required" })
        .refine((val) => !val || phoneRegex.test(val), {
          error: "Phone number must contain only digits and dashes",
        }),
      instagram: z
        .string()
        .optional()
        .refine((val) => !val || socialMediaRegex.test(val), {
          message: "Invalid Instagram format",
        }),
      facebook: z
        .string()
        .url("Must be a valid URL")
        .optional()
        .or(z.literal("")),
      tiktok: z
        .string()
        .optional()
        .refine((val) => !val || socialMediaRegex.test(val), {
          message: "Invalid TikTok format",
        }),
      slug: z
        .string()
        .nonempty({ message: "Slug is required" })
        .min(2, "Slug must be at least 2 characters long")
        .max(255, "Slug must be at most 255 characters long")
        .refine((val) => slugRegex.test(val), {
          message:
            "Slug must be lowercase, alphanumeric, and can include hyphens",
        }),
    }),
  }),
  // * New: June 7, 2026
  updateStore: z.object({
    params: z.object({
      storeId: z.string().uuid({ message: "Invalid Store ID format" }),
    }),
    body: z.object({
      name: z
        .string()
        .min(2, "Name must be at least 2 characters long")
        .max(255, "Name must be at most 255 characters long")
        .optional(),
      currency: z.string().optional(),
      countryCode: z.string().optional(),
      language: z.string().optional(),
      color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
        .optional(),
      phoneNumber: z
        .string()
        .refine((val) => !val || phoneRegex.test(val), {
          error: "Phone number must contain only digits and dashes",
        })
        .optional(),
      instagram: z
        .string()
        .optional()
        .refine((val) => !val || socialMediaRegex.test(val), {
          message: "Invalid Instagram format",
        }),
      facebook: z
        .string()
        .url("Must be a valid URL")
        .optional()
        .or(z.literal("")),
      tiktok: z
        .string()
        .optional()
        .refine((val) => !val || socialMediaRegex.test(val), {
          message: "Invalid TikTok format",
        }),
      slug: z
        .string()
        .min(2, "Slug must be at least 2 characters long")
        .max(255, "Slug must be at most 255 characters long")
        .refine((val) => slugRegex.test(val), {
          message:
            "Slug must be lowercase, alphanumeric, and can include hyphens",
        })
        .optional(),
      logo: z
        .object({
          url: z
            .string()
            .url("Must be a valid URL")
            .nonempty({ message: "Logo URL is required" }),
          fileId: z.string().nonempty({ message: "File ID is required" }),
        })
        .optional(),
    }),
  }),
  // * New: June 7, 2026 - Added updateLogoStore schema to validate logo update requests
  updateLogoStore: z.object({
    params: z.object({
      storeId: z.string().uuid({ message: "Invalid Store ID format" }),
    }),
    body: z.object({
      logoUrl: z
        .string()
        .url("Must be a valid URL")
        .nonempty({ message: "Logo URL is required" }),
      fileId: z.string().nonempty({ message: "File ID is required" }),
    }),
  }),
  deleteLogoFromImageKit: z.object({
    params: z.object({
      storeId: z.string().uuid({ message: "Invalid Store ID format" }),
      fileId: z.string().nonempty({ message: "File ID is required" }),
    }),
  }),
};

export type CreateStoreDTO = z.infer<typeof StoreSchema.createStore>["body"];
export type UpdateStoreDTO = z.infer<typeof StoreSchema.updateStore>["body"];
export type UpdateLogoStoreDTO = z.infer<
  typeof StoreSchema.updateLogoStore
>["body"];
