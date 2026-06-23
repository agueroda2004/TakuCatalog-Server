import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import { createTestApp } from "../tests/app.helper";
import { storeRoute } from "./store.route";
import { storeService } from "../services/store.service";
import { cleanDatabase, createTestStore } from "../tests/helpers";
import prisma from "../lib/prisma";

vi.mock("@clerk/express", async () => {
  const actual = await vi.importActual("@clerk/express");
  return {
    ...actual,
    getAuth: vi.fn().mockReturnValue({ userId: "user_3Eb6oyNBeKLT0iLp5EkqKGRQNcP" }),
    clerkMiddleware: vi.fn(),
  };
});

vi.mock("../lib/imagekit", () => ({
  deleteImage: vi.fn().mockResolvedValue(undefined),
}));

let app: ReturnType<typeof createTestApp>;
const USER_ID = "user_3Eb6oyNBeKLT0iLp5EkqKGRQNcP";

const validStoreData = {
  name: "Test Store",
  slug: "test-store",
  phoneNumber: "12345678",
  color: "#000000",
  currencyCode: "USD",
  countryCode: "+506",
  language: "en",
};

beforeAll(() => {
  const service = new storeService();
  app = createTestApp(storeRoute(service));
});

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
});

describe("POST /store", () => {
  it("should create a store", async () => {
    const response = await request(app).post("/").send(validStoreData);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Store created successfully");
    expect(response.body.data).toHaveProperty("id");
    expect(response.body.data.slug).toBe(validStoreData.slug);
  });

  it("should return 400 when data is invalid", async () => {
    const response = await request(app).post("/").send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation error");
  });

  it("should return 400 when slug format is invalid", async () => {
    const response = await request(app)
      .post("/")
      .send({ ...validStoreData, slug: "Invalid SLUG" });

    expect(response.status).toBe(400);
  });

  it("should return 400 when color format is invalid", async () => {
    const response = await request(app)
      .post("/")
      .send({ ...validStoreData, color: "red" });

    expect(response.status).toBe(400);
  });

  it("should return 409 when slug already exists", async () => {
    await createTestStore({ slug: "existing-slug" });

    const response = await request(app)
      .post("/")
      .send({ ...validStoreData, slug: "existing-slug" });

    expect(response.status).toBe(409);
  });

  it("should return 409 when phoneNumber already exists", async () => {
    await createTestStore({ phoneNumber: "12345678" });

    const response = await request(app)
      .post("/")
      .send({ ...validStoreData, phoneNumber: "12345678" });

    expect(response.status).toBe(409);
  });
});

describe("PATCH /store/:storeId/logo", () => {
  it("should update logo successfully", async () => {
    const store = await createTestStore();

    const response = await request(app)
      .patch(`/${store.id}/logo`)
      .send({
        logoUrl: "https://example.com/new-logo.png",
        fileId: "new-file-id",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Store logo updated successfully");
  });

  it("should return 400 when logoUrl is invalid", async () => {
    const store = await createTestStore();

    const response = await request(app)
      .patch(`/${store.id}/logo`)
      .send({ logoUrl: "not-a-url", fileId: "123" });

    expect(response.status).toBe(400);
  });

  it("should return 400 when storeId is not uuid", async () => {
    const response = await request(app)
      .patch("/not-uuid/logo")
      .send({ logoUrl: "https://example.com/logo.png", fileId: "123" });

    expect(response.status).toBe(400);
  });

  it("should return 404 when store does not exist", async () => {
    const response = await request(app)
      .patch("/00000000-0000-0000-0000-000000000000/logo")
      .send({ logoUrl: "https://example.com/logo.png", fileId: "123" });

    expect(response.status).toBe(404);
  });
});

describe("PATCH /store/:storeId", () => {
  it("should update store successfully", async () => {
    const store = await createTestStore();

    const response = await request(app)
      .patch(`/${store.id}`)
      .send({ name: "New Name" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Store updated successfully");
  });

  it("should update multiple fields", async () => {
    const store = await createTestStore();

    const response = await request(app)
      .patch(`/${store.id}`)
      .send({ name: "New Name", color: "#FFFFFF" });

    expect(response.status).toBe(200);
  });

  it("should return 400 when storeId is not uuid", async () => {
    const response = await request(app)
      .patch("/not-uuid")
      .send({ name: "New Name" });

    expect(response.status).toBe(400);
  });

  it("should return 400 when color format is invalid", async () => {
    const store = await createTestStore();

    const response = await request(app)
      .patch(`/${store.id}`)
      .send({ color: "invalid" });

    expect(response.status).toBe(400);
  });

  it("should return 404 when store does not exist", async () => {
    const response = await request(app)
      .patch("/00000000-0000-0000-0000-000000000000")
      .send({ name: "New Name" });

    expect(response.status).toBe(404);
  });

  it("should return 409 when slug belongs to another store", async () => {
    const store1 = await createTestStore({ slug: "store1" });
    await createTestStore({ slug: "store2" });

    const response = await request(app)
      .patch(`/${store1.id}`)
      .send({ slug: "store2" });

    expect(response.status).toBe(409);
  });
});

describe("GET /store/has-store", () => {
  it("should return store data when user has store", async () => {
    const store = await createTestStore();

    const response = await request(app).get("/has-store");

    expect(response.status).toBe(201);
    expect(response.body.data.hasStore).toBe(true);
    expect(response.body.data.store.id).toBe(store.id);
  });

  it("should return hasStore: false when user has no store", async () => {
    const response = await request(app).get("/has-store");

    expect(response.status).toBe(201);
    expect(response.body.data.hasStore).toBe(false);
    expect(response.body.data.store).toBeNull();
  });
});

describe("DELETE /store/:storeId/logo/:fileId", () => {
  it("should delete logo successfully", async () => {
    const store = await createTestStore();
    await prisma.logo.create({
      data: { storeId: store.id, url: "https://example.com/logo.png", fileId: "fid" },
    });

    const response = await request(app).delete(`/${store.id}/logo/fid`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Store logo deleted successfully");
  });

  it("should return 400 when storeId is not uuid", async () => {
    const response = await request(app).delete("/invalid/logo/fid");

    expect(response.status).toBe(400);
  });

  it("should return 400 when fileId is empty", async () => {
    const store = await createTestStore();

    const response = await request(app).delete(`/${store.id}/logo/`);

    expect(response.status).toBe(404);
  });

  it("should return 404 when store does not exist", async () => {
    const response = await request(app).delete(
      "/00000000-0000-0000-0000-000000000000/logo/fid",
    );

    expect(response.status).toBe(404);
  });

  it("should return 403 when user is not store owner", async () => {
    const store = await createTestStore({ userId: "other_user" });
    await prisma.logo.create({
      data: { storeId: store.id, url: "https://example.com/logo.png", fileId: "fid" },
    });

    const response = await request(app).delete(`/${store.id}/logo/fid`);

    expect(response.status).toBe(403);
  });
});