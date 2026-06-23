import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createContainer } from "../container";
import { createTestApp } from "../tests/app.helper";
import { productTypeRoute } from "./productType.route";
import {
  cleanDatabase,
  createTestStore,
  createTestBrand,
  createTestProduct,
} from "../tests/helpers";
import request from "supertest";
import prisma from "../lib/prisma";

vi.mock("@clerk/express", async () => {
  const actual = await vi.importActual("@clerk/express");
  return {
    ...actual,
    getAuth: vi.fn().mockReturnValue({
      userId: "user_3Eb6oyNBeKLT0iLp5EkqKGRQNcP",
    }),
    clerkMiddleware: vi
      .fn()
      .mockReturnValue((req: any, _res: any, next: any) => {
        req.userId = "user_3Eb6oyNBeKLT0iLp5EkqKGRQNcP";
        next();
      }),
  };
});

let app: ReturnType<typeof createTestApp>;

beforeAll(() => {
  app = createTestApp(productTypeRoute(createContainer().productTypeService));
});

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
});

describe("POST /productType", () => {
  it("should create a new product type", async () => {
    const store = await createTestStore();

    const response = await request(app).post("/").send({
      name: "Test Product Type",
      storeId: store.id,
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Product type created successfully");
  });

  it("should return a 400 error when the request data is invalid", async () => {
    const response = await request(app).post("/").send({
      name: "",
      storeId: "",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation error");
  });

  it("should return a 409 error when a product type with the same name already exists in the same store", async () => {
    const store = await createTestStore();

    await request(app).post("/").send({
      name: "Test Product Type",
      storeId: store.id,
    });

    const response = await request(app).post("/").send({
      name: "Test Product Type",
      storeId: store.id,
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "A product type with the same name already exists",
    );
  });

  it("should return a 403 error when user is not the store owner", async () => {
    const store = await createTestStore({ userId: "other_user_id" });

    const response = await request(app).post("/").send({
      name: "Test Product Type",
      storeId: store.id,
    });

    expect(response.status).toBe(403);
  });
});

describe("PATCH /productType/:id", () => {
  it("should update a product type", async () => {
    const store = await createTestStore();
    const pt = await prisma.productType.create({
      data: { name: "Old", storeId: store.id },
    });

    const response = await request(app)
      .patch(`/${pt.id}`)
      .send({ name: "Updated" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Product type updated successfully");
  });

  it("should return 400 when data is invalid", async () => {
    const response = await request(app)
      .patch("/invalid-uuid")
      .send({ name: "Updated" });

    expect(response.status).toBe(400);
  });

  it("should return 404 when product type does not exist", async () => {
    const response = await request(app)
      .patch("/00000000-0000-0000-0000-000000000000")
      .send({ name: "Updated" });

    expect(response.status).toBe(404);
  });

  it("should return 409 when updating to duplicate name", async () => {
    const store = await createTestStore();
    const pt1 = await prisma.productType.create({
      data: { name: "Type 1", storeId: store.id },
    });
    const pt2 = await prisma.productType.create({
      data: { name: "Type 2", storeId: store.id },
    });

    const response = await request(app)
      .patch(`/${pt2.id}`)
      .send({ name: "Type 1" });

    expect(response.status).toBe(409);
  });

  it("should return 403 when user is not the store owner", async () => {
    const store = await createTestStore({ userId: "other_user_id" });
    const pt = await prisma.productType.create({
      data: { name: "Test", storeId: store.id },
    });

    const response = await request(app)
      .patch(`/${pt.id}`)
      .send({ name: "Updated" });

    expect(response.status).toBe(403);
  });
});

describe("DELETE /productType/:id", () => {
  it("should hard-delete a product type without products", async () => {
    const store = await createTestStore();
    const pt = await prisma.productType.create({
      data: { name: "ToDelete", storeId: store.id },
    });

    const response = await request(app).delete(`/${pt.id}`);

    expect(response.status).toBe(201);
    expect(response.body.message).toContain("deleted successfully");
  });

  it("should soft-delete a product type with products", async () => {
    const store = await createTestStore();
    const brand = await createTestBrand(store.id);
    const pt = await prisma.productType.create({
      data: { name: "ToDelete", storeId: store.id },
    });
    await createTestProduct(store.id, pt.id, brand.id);

    const response = await request(app).delete(`/${pt.id}`);

    expect(response.status).toBe(201);
    expect(response.body.message).toContain("soft-deleted successfully");
  });

  it("should return 404 when id is not a valid uuid", async () => {
    const response = await request(app).delete("/invalid-uuid");
    expect(response.status).toBe(404);
  });

  it("should return 404 when product type does not exist", async () => {
    const response = await request(app).delete(
      "/00000000-0000-0000-0000-000000000000",
    );
    expect(response.status).toBe(404);
  });

  it("should return 403 when user is not the store owner", async () => {
    const store = await createTestStore({ userId: "other_user_id" });
    const pt = await prisma.productType.create({
      data: { name: "Test", storeId: store.id },
    });

    const response = await request(app).delete(`/${pt.id}`);

    expect(response.status).toBe(403);
  });
});
