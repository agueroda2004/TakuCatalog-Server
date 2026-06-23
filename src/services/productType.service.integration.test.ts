import { describe, it, expect, beforeEach } from "vitest";
import { ProductTypeService } from "./productType.service";
import { cleanDatabase, createTestStore, createTestBrand, createTestProduct } from "../tests/helpers";
import prisma from "../lib/prisma";

const USER_ID = "user_3Eb6oyNBeKLT0iLp5EkqKGRQNcP";

describe("ProductTypeService Integration Tests", () => {
  let productTypeService: ProductTypeService;

  beforeEach(async () => {
    await cleanDatabase();
    productTypeService = new ProductTypeService();
  });

  describe("createProductType", () => {
    it("should create a new product type", async () => {
      const store = await createTestStore();
      await productTypeService.createProductType(
        {
          name: "Test Product Type",
          storeId: store.id,
        },
        USER_ID,
      );

      const created = await prisma.productType.findFirst({
        where: { name: "Test Product Type", storeId: store.id },
      });

      expect(created).toBeDefined();
      expect(created?.name).toBe("Test Product Type");
    });

    it("should not create a product type with a duplicate name in the same store", async () => {
      const store = await createTestStore();
      await productTypeService.createProductType(
        {
          name: "Test Product Type",
          storeId: store.id,
        },
        USER_ID,
      );
      await expect(
        productTypeService.createProductType(
          {
            name: "Test Product Type",
            storeId: store.id,
          },
          USER_ID,
        ),
      ).rejects.toThrow("A product type with the same name already exists");
    });

    it("should throw 403 when user is not the store owner", async () => {
      const store = await createTestStore({ userId: "other_user_id" });
      await expect(
        productTypeService.createProductType({ name: "Test", storeId: store.id }, USER_ID),
      ).rejects.toThrow("You are not the owner of this store");
    });

    it("should throw 404 when store does not exist", async () => {
      await expect(
        productTypeService.createProductType(
          { name: "Test", storeId: "00000000-0000-0000-0000-000000000000" },
          USER_ID,
        ),
      ).rejects.toThrow("Store not found");
    });
  });

  describe("updateProductType", () => {
    it("should update an existing product type", async () => {
      const store = await createTestStore();
      const productType = await prisma.productType.create({
        data: {
          name: "Old Product Type",
          storeId: store.id,
        },
      });
      await productTypeService.updateProductType(
        {
          id: productType.id,
          name: "Updated Product Type",
        },
        USER_ID,
      );
      const updated = await prisma.productType.findUnique({
        where: { id: productType.id },
      });
      expect(updated?.name).toBe("Updated Product Type");
    });

    it("should not update a product type to a duplicate name in the same store", async () => {
      const store = await createTestStore();
      const productType1 = await prisma.productType.create({
        data: {
          name: "Product Type 1",
          storeId: store.id,
        },
      });
      const productType2 = await prisma.productType.create({
        data: {
          name: "Product Type 2",
          storeId: store.id,
        },
      });
      await expect(
        productTypeService.updateProductType(
          {
            id: productType2.id,
            name: "Product Type 1",
          },
          USER_ID,
        ),
      ).rejects.toThrow("A product type with the same name already exists");
    });

    it("should throw 404 when product type does not exist", async () => {
      await expect(
        productTypeService.updateProductType(
          { id: "00000000-0000-0000-0000-000000000000", name: "Updated" },
          USER_ID,
        ),
      ).rejects.toThrow("Product type not found");
    });

    it("should throw 403 when user is not the store owner", async () => {
      const store = await createTestStore({ userId: "other_user_id" });
      const pt = await prisma.productType.create({ data: { name: "Test", storeId: store.id } });
      await expect(
        productTypeService.updateProductType({ id: pt.id, name: "Updated" }, USER_ID),
      ).rejects.toThrow("You are not the owner of this store");
    });

    it("should update only active field when name is not provided", async () => {
      const store = await createTestStore();
      const pt = await prisma.productType.create({ data: { name: "Test", storeId: store.id } });
      await productTypeService.updateProductType({ id: pt.id, active: false }, USER_ID);
      const updated = await prisma.productType.findUnique({ where: { id: pt.id } });
      expect(updated?.name).toBe("Test");
      expect(updated?.active).toBe(false);
    });
  });

  describe("deleteProductType", () => {
    it("should delete an existing product type", async () => {
      const store = await createTestStore();
      const productType = await prisma.productType.create({
        data: {
          name: "Product Type to Delete",
          storeId: store.id,
        },
      });
      await productTypeService.deleteProductType({ id: productType.id }, USER_ID);
      const deleted = await prisma.productType.findUnique({
        where: { id: productType.id },
      });
      expect(deleted).toBeNull();
    });

    it("should throw 404 when product type does not exist", async () => {
      await expect(
        productTypeService.deleteProductType({ id: "00000000-0000-0000-0000-000000000000" }, USER_ID),
      ).rejects.toThrow("Product type not found");
    });

    it("should throw 403 when user is not the store owner", async () => {
      const store = await createTestStore({ userId: "other_user_id" });
      const pt = await prisma.productType.create({ data: { name: "Test", storeId: store.id } });
      await expect(
        productTypeService.deleteProductType({ id: pt.id }, USER_ID),
      ).rejects.toThrow("You are not the owner of this store");
    });

    it("should soft-delete when product type has associated products", async () => {
      const store = await createTestStore();
      const brand = await createTestBrand(store.id);
      const pt = await prisma.productType.create({ data: { name: "Test", storeId: store.id } });
      await createTestProduct(store.id, pt.id, brand.id);

      const result = await productTypeService.deleteProductType({ id: pt.id }, USER_ID);
      expect(result).toBe("soft-deleted");

      const updated = await prisma.productType.findUnique({ where: { id: pt.id } });
      expect(updated?.active).toBe(false);
    });
  });

  describe("getProductTypesByStore", () => {
    it("should return all active product types for a store", async () => {
      const store = await createTestStore();
      await prisma.productType.createMany({
        data: [
          { name: "Type 1", storeId: store.id, active: true },
          { name: "Type 2", storeId: store.id, active: true },
          { name: "Type 3", storeId: store.id, active: false },
        ],
      });

      const result = await productTypeService.getProductTypesByStore(store.id);
      expect(result).toHaveLength(2);
    });

    it("should throw 404 when store does not exist", async () => {
      await expect(
        productTypeService.getProductTypesByStore("00000000-0000-0000-0000-000000000000"),
      ).rejects.toThrow("Store not found");
    });
  });

  describe("getProductTypeById", () => {
    it("should return a product type by id", async () => {
      const store = await createTestStore();
      const pt = await prisma.productType.create({ data: { name: "Test", storeId: store.id } });

      const result = await productTypeService.getProductTypeById(pt.id);
      expect(result.name).toBe("Test");
    });

    it("should throw 404 when product type does not exist", async () => {
      await expect(
        productTypeService.getProductTypeById("00000000-0000-0000-0000-000000000000"),
      ).rejects.toThrow("Product type not found");
    });
  });
});
