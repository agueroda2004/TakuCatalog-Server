import CustomError, { throwNotFound } from "../errors/customError";
import { deleteImage } from "../lib/imagekit";
import prisma from "../lib/prisma";
import type {
  CreateStoreDTO,
  DeleteLogoFromImageKitDTO,
  HasStoreResponse,
  UpdateLogoStoreDTO,
  UpdateStoreDTO,
} from "../types/store";
import { validateStoreOwner } from "../utils/storeAuth";
import type { IStoreService } from "./interfaces/store.interface";

export class storeService implements IStoreService {
  async createStore(data: CreateStoreDTO, userId: string) {
    const existingStore = await prisma.store.findFirst({
      where: {
        OR: [{ slug: data.slug }, { phoneNumber: data.phoneNumber }],
      },
    });

    if (existingStore) {
      throw new CustomError({
        message: "Store with the same slug or phone number already exists",
        statusCode: 409,
        errorCode: "UNIQUE_FIELD_ERROR",
        isOperational: true,
        reason:
          "This error occurs when a store with the same slug or phone number already exists in the database.",
      });
    }

    return await prisma.store.create({
      data: {
        name: data.name,
        slug: data.slug,
        phoneNumber: data.phoneNumber,
        color: data.color,
        instagram: data.instagram ?? null,
        facebook: data.facebook ?? null,
        tiktok: data.tiktok ?? null,
        currency: data.currencyCode,
        countryCode: data.countryCode,
        userId: userId,
        language: data.language,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        phoneNumber: true,
        color: true,
        instagram: true,
        facebook: true,
        tiktok: true,
        currency: true,
        countryCode: true,
        language: true,
      },
    });
  }
  async updateLogoStore(data: UpdateLogoStoreDTO) {
    const existingStore = await prisma.store.findFirst({
      where: { id: data.storeId },
    });

    if (!existingStore) {
      throwNotFound("Store not found");
      return;
    }

    await prisma.store.update({
      where: {
        id: existingStore.id,
      },
      data: {
        logo: {
          upsert: {
            create: {
              url: data.logoUrl,
              fileId: data.fileId,
            },
            update: {
              url: data.logoUrl,
              fileId: data.fileId,
            },
          },
        },
      },
    });
  }
  /**
   * Function to check if a user already has a store associated with their account.
   * @param userId - The Clerk ID of the user to check for an associated store.
   * @returns A boolean indicating whether the user has an associated store (true) or not (false).
   */
  async hasStore(userId: string): Promise<HasStoreResponse> {
    const store = await prisma.store.findFirst({
      where: {
        userId,
      },
      select: {
        id: true,
        color: true,
        logo: {
          select: {
            url: true,
            fileId: true,
          },
        },
        name: true,
        countryCode: true,
        currency: true,
        facebook: true,
        instagram: true,
        tiktok: true,
        phoneNumber: true,
        slug: true,
        language: true,
      },
    });

    return { hasStore: !!store, store: store || null };
  }

  async updateStore(data: UpdateStoreDTO) {
    const existingStore = await prisma.store.findUnique({
      where: { id: data.storeId },
    });

    if (!existingStore) {
      throwNotFound("Store not found");
      return;
    }

    if (data.slug) {
      const existingStoreWithSlug = await prisma.store.findFirst({
        where: { slug: data.slug },
      });

      if (
        existingStoreWithSlug &&
        existingStoreWithSlug.id !== existingStore.id
      ) {
        throw new CustomError({
          statusCode: 409,
          message: "Store with the same slug already exists",
          errorCode: "UNIQUE_FIELD_ERROR",
          isOperational: true,
          reason:
            "This error occurs when a store with the same slug already exists in the database.",
        });
      }
    }

    if (data.phoneNumber) {
      const existingStoreWithPhoneNumber = await prisma.store.findFirst({
        where: { phoneNumber: data.phoneNumber },
      });
      if (
        existingStoreWithPhoneNumber &&
        existingStoreWithPhoneNumber.id !== existingStore.id
      ) {
        throw new CustomError({
          statusCode: 409,
          message: "Store with the same phone number already exists",
          errorCode: "UNIQUE_FIELD_ERROR",
          isOperational: true,
          reason:
            "This error occurs when a store with the same phone number already exists in the database.",
        });
      }
    }

    await prisma.store.update({
      where: {
        id: existingStore.id,
      },
      data: {
        name: data.name ?? existingStore.name,
        slug: data.slug ?? existingStore.slug,
        phoneNumber: data.phoneNumber ?? existingStore.phoneNumber,
        color: data.color ?? existingStore.color,
        instagram: data.instagram ?? existingStore.instagram,
        facebook: data.facebook ?? existingStore.facebook,
        tiktok: data.tiktok ?? existingStore.tiktok,
        currency: data.currency ?? existingStore.currency,
        countryCode: data.countryCode ?? existingStore.countryCode,
        language: data.language ?? existingStore.language,
        ...(data.logo && {
          logo: {
            upsert: {
              create: {
                url: data.logo.url,
                fileId: data.logo.fileId,
              },
              update: {
                url: data.logo.url,
                fileId: data.logo.fileId,
              },
            },
          },
        }),
      },
    });
  }

  async deleteLogoFromImageKit(
    data: DeleteLogoFromImageKitDTO,
    requesterId: string,
  ) {
    await validateStoreOwner(data.storeId, requesterId);
    await deleteImage(data.fileId);
  }
}
