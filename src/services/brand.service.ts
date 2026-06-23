import CustomError from "../errors/customError";
import prisma from "../lib/prisma";
import type { CreateBrandDTO, UpdateBrandDTO } from "../schemas/brand.schema";
import { validateStoreOwner } from "../utils/storeAuth";

export const brandService = {
  /**
   * Function to create a new brand.
   * @param data - Data for creating a new brand.
   * @param requesterId - ID of the user making the request.
   * @returns The created brand.
   * @throws {CustomError} Throws a CustomError if a brand with the same name already exists in the store.
   */
  async createBrand(data: CreateBrandDTO, requesterId: string) {
    await validateStoreAuth(data.storeId, requesterId);

    const existingBrand = await prisma.brand.findFirst({
      where: { name: data.name, storeId: data.storeId },
    });

    if (existingBrand) {
      throw new CustomError({
        statusCode: 409,
        message: "A brand with the same name already exists",
        errorCode: "CONFLICT",
        isOperational: true,
      });
    }

    return await prisma.brand.create({
      data: {
        name: data.name,
        store: { connect: { id: data.storeId } },
      },
    });
  },
  /**
   * Function to update an existing brand.
   * @param {id, ...fields} - Object containing the ID of the brand to update and the fields to update.
   * @param requesterId - ID of the user making the request.
   * @returns The updated brand.
   * @throws {CustomError} Throws a CustomError if the brand is not found or if a brand with the same name already exists in the store.
   */
  async updateBrand({ id, ...fields }: UpdateBrandDTO, requesterId: string) {
    const brand = await prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new CustomError({
        statusCode: 404,
        message: "Brand not found",
        errorCode: "NOT_FOUND",
        isOperational: true,
      });
    }

    await validateStoreAuth(brand.storeId, requesterId);

    const dataToUpdate = Object.fromEntries(
      Object.entries(fields).filter(
        ([key, value]) =>
          value !== undefined && value !== brand[key as keyof typeof brand],
      ),
    );

    if (Object.keys(dataToUpdate).length === 0) {
      return brand;
    }

    return await prisma.brand.update({
      where: { id },
      data: dataToUpdate,
    });
  },
  /**
   * Function to delete or soft delete a brand.
   * @param id - The ID of the brand to delete or soft-delete.
   * @param requesterId - ID of the user making the request.
   * @returns A string indicating whether the brand was "deleted" or "soft-deleted".
   * @throws {CustomError} Throws a CustomError if the brand is not found.
   */
  async deleteBrand(id: string, requesterId: string) {
    const brand = await prisma.brand.findUnique({
      where: { id },
      select: { storeId: true, products: { take: 1, select: { id: true } } },
    });

    if (!brand) {
      throw new CustomError({
        statusCode: 404,
        message: "Brand not found",
        errorCode: "NOT_FOUND",
      });
    }

    await validateStoreAuth(brand.storeId, requesterId);

    const hasProducts = brand.products.length > 0;

    if (hasProducts) {
      await prisma.brand.update({
        where: { id },
        data: {
          active: false,
        },
      });
      return "soft-deleted";
    } else {
      await prisma.brand.delete({
        where: { id },
      });
      return "deleted";
    }
  },
  /**
   * Function to get all active brands for a specific store.
   * @param storeId - The ID of the store to get brands for.
   * @returns An array of active brands for the specified store.
   */
  async getBrandsByStore(storeId: string) {
    const brands = await prisma.brand.findMany({
      where: { storeId, active: true },
    });
    return brands;
  },
  /**
   * Function to get a brand by its ID.
   * @param id - The ID of the brand to retrieve.
   * @returns The brand with the specified ID, or null if not found.
   */
  async getBrandById(id: string) {
    const brand = await prisma.brand.findUnique({
      where: { id },
    });
    if (!brand) {
      throw new CustomError({
        statusCode: 404,
        message: "Brand not found",
        errorCode: "NOT_FOUND",
      });
    }

    return brand;
  },
};
