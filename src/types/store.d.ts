import { z } from "zod";
import type { StoreSchema } from "../schemas/store.schema";

export type CreateStoreDTO = z.infer<typeof StoreSchema.createStore>["body"];
export type UpdateStoreDTO = z.infer<typeof StoreSchema.updateStore>["body"] &
  z.infer<typeof StoreSchema.updateStore>["params"];
export type UpdateLogoStoreDTO = z.infer<
  typeof StoreSchema.updateLogoStore
>["body"] &
  z.infer<typeof StoreSchema.updateLogoStore>["params"];
export type DeleteLogoFromImageKitDTO = z.infer<
  typeof StoreSchema.deleteLogoFromImageKit
>["params"];

export type StoreResponse = {
  id: string;
  name: string;
  slug: string;
  phoneNumber: string;
  color: string;
  currency: string;
  countryCode: string;
  language: string;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
};

export type HasStoreResponse = {
  hasStore: boolean;
  store: {
    id: string;
    color: string;
    logo: {
      url: string;
      fileId: string;
    } | null;
    name: string;
    countryCode: string;
    currency: string;
    facebook: string | null;
    instagram: string | null;
    tiktok: string | null;
    phoneNumber: string;
    slug: string;
    language: string;
  } | null;
};
