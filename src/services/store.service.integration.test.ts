import { describe, it, expect, beforeEach, vi } from "vitest";
import { storeService } from "./store.service";
import { cleanDatabase, createTestStore } from "../tests/helpers";
import prisma from "../lib/prisma";
import { deleteImage } from "../lib/imagekit";

vi.mock("../lib/imagekit", () => ({
  deleteImage: vi.fn().mockResolvedValue({ success: true }),
}));

const USER_ID = "user_3Eb6oyNBeKLT0iLp5EkqKGRQNcP";

const validStoreData = {
  name: "Test Store",
  slug: "test-store",
  phoneNumber: "12345678",
  color: "#000000",
  currencyCode: "USD",
  countryCode: "+506",
  language: "en",
  instagram: "@test",
  facebook: "https://facebook.com/test",
  tiktok: "@test",
};

describe("StoreService Integration Tests", () => {
  let service: storeService;

  beforeEach(async () => {
    await cleanDatabase();
    service = new storeService();
    vi.clearAllMocks();
  });

  describe("createStore", () => {
    it("should create a store successfully", async () => {
      const result = await service.createStore(validStoreData, USER_ID);

      expect(result.id).toBeDefined();
      expect(result.slug).toBe(validStoreData.slug);
      expect(result.name).toBe(validStoreData.name);
      expect(result.phoneNumber).toBe(validStoreData.phoneNumber);
    });

    it("should throw 409 when slug already exists", async () => {
      await createTestStore({ slug: "existing-slug" });

      await expect(
        service.createStore(
          { ...validStoreData, slug: "existing-slug" },
          USER_ID,
        ),
      ).rejects.toThrow(
        "Store with the same slug or phone number already exists",
      );
    });

    it("should throw 409 when phoneNumber already exists", async () => {
      await createTestStore({ phoneNumber: "12345678" });

      await expect(
        service.createStore(
          { ...validStoreData, phoneNumber: "12345678" },
          USER_ID,
        ),
      ).rejects.toThrow(
        "Store with the same slug or phone number already exists",
      );
    });
  });

  describe("updateLogoStore", () => {
    it("should update logo successfully", async () => {
      const store = await createTestStore();

      await service.updateLogoStore({
        storeId: store.id,
        logoUrl: "https://example.com/new-logo.png",
        fileId: "new-file-id",
      });

      const logo = await prisma.logo.findUnique({
        where: { storeId: store.id },
      });
      expect(logo?.url).toBe("https://example.com/new-logo.png");
      expect(logo?.fileId).toBe("new-file-id");
    });

    it("should throw 404 when store does not exist", async () => {
      await expect(
        service.updateLogoStore({
          storeId: "00000000-0000-0000-0000-000000000000",
          logoUrl: "https://example.com/logo.png",
          fileId: "file-id",
        }),
      ).rejects.toThrow("Store not found");
    });
  });

  describe("hasStore", () => {
    it("should return hasStore: true with store data", async () => {
      const store = await createTestStore();
      await prisma.logo.create({
        data: {
          storeId: store.id,
          url: "https://example.com/logo.png",
          fileId: "fid",
        },
      });

      const result = await service.hasStore(USER_ID);

      expect(result.hasStore).toBe(true);
      expect(result.store?.id).toBe(store.id);
      expect(result.store?.logo?.url).toBe("https://example.com/logo.png");
    });

    it("should return hasStore: false with null store", async () => {
      const result = await service.hasStore("user_without_store");

      expect(result.hasStore).toBe(false);
      expect(result.store).toBeNull();
    });
  });

  describe("updateStore", () => {
    it("should update only name", async () => {
      const store = await createTestStore();

      await service.updateStore({ storeId: store.id, name: "New Name" });

      const updated = await prisma.store.findUnique({ where: { id: store.id } });
      expect(updated?.name).toBe("New Name");
    });

    it("should update only slug", async () => {
      const store = await createTestStore();

      await service.updateStore({ storeId: store.id, slug: "new-slug" });

      const updated = await prisma.store.findUnique({ where: { id: store.id } });
      expect(updated?.slug).toBe("new-slug");
    });

    it("should update only phoneNumber", async () => {
      const store = await createTestStore();

      await service.updateStore({
        storeId: store.id,
        phoneNumber: "999-999",
      });

      const updated = await prisma.store.findUnique({ where: { id: store.id } });
      expect(updated?.phoneNumber).toBe("999-999");
    });

    it("should update multiple fields", async () => {
      const store = await createTestStore();

      await service.updateStore({
        storeId: store.id,
        name: "New Name",
        color: "#FFFFFF",
        instagram: "@newaccount",
      });

      const updated = await prisma.store.findUnique({ where: { id: store.id } });
      expect(updated?.name).toBe("New Name");
      expect(updated?.color).toBe("#FFFFFF");
      expect(updated?.instagram).toBe("@newaccount");
    });

    it("should update logo via upsert", async () => {
      const store = await createTestStore();

      await service.updateStore({
        storeId: store.id,
        logo: {
          url: "https://example.com/new-logo.png",
          fileId: "new-fid",
        },
      });

      const logo = await prisma.logo.findUnique({ where: { storeId: store.id } });
      expect(logo?.url).toBe("https://example.com/new-logo.png");
      expect(logo?.fileId).toBe("new-fid");
    });

    it("should throw 404 when store does not exist", async () => {
      await expect(
        service.updateStore({
          storeId: "00000000-0000-0000-0000-000000000000",
        }),
      ).rejects.toThrow("Store not found");
    });

    it("should throw 409 when slug belongs to another store", async () => {
      const store1 = await createTestStore({ slug: "store1" });
      const store2 = await createTestStore({ slug: "store2" });

      await expect(
        service.updateStore({ storeId: store2.id, slug: "store1" }),
      ).rejects.toThrow("Store with the same slug already exists");
    });

    it("should throw 409 when phoneNumber belongs to another store", async () => {
      const store1 = await createTestStore({ phoneNumber: "11111111" });
      const store2 = await createTestStore({ phoneNumber: "22222222" });

      await expect(
        service.updateStore({ storeId: store2.id, phoneNumber: "11111111" }),
      ).rejects.toThrow("Store with the same phone number already exists");
    });
  });

  describe("deleteLogoFromImageKit", () => {
    it("should delete logo from ImageKit", async () => {
      const store = await createTestStore();
      await prisma.logo.create({
        data: { storeId: store.id, url: "https://...", fileId: "fid" },
      });

      await service.deleteLogoFromImageKit(
        { storeId: store.id, fileId: "fid" },
        USER_ID,
      );

      expect(deleteImage).toHaveBeenCalledWith("fid");
    });

    it("should throw 403 when user is not the store owner", async () => {
      const store = await createTestStore({ userId: "other_user" });
      await prisma.logo.create({
        data: { storeId: store.id, url: "https://...", fileId: "fid" },
      });

      await expect(
        service.deleteLogoFromImageKit(
          { storeId: store.id, fileId: "fid" },
          USER_ID,
        ),
      ).rejects.toThrow("You are not the owner of this store");
    });

    it("should throw 404 when store does not exist", async () => {
      await expect(
        service.deleteLogoFromImageKit(
          { storeId: "00000000-0000-0000-0000-000000000000", fileId: "fid" },
          USER_ID,
        ),
      ).rejects.toThrow("Store not found");
    });
  });
});