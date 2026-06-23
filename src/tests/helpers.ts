import prisma from "../lib/prisma";

export async function cleanDatabase() {
  await prisma.product.deleteMany();
  await prisma.productType.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.store.deleteMany();
}

export async function createTestStore(overrides = {}) {
  return await prisma.store.create({
    data: {
      userId: "user_3Eb6oyNBeKLT0iLp5EkqKGRQNcP",
      slug: `test-store-${Date.now()}`,
      name: "Test Store",
      countryCode: "+506",
      phoneNumber: "87236301",
      currency: "USD",
      color: "#000000",
      ...overrides,
    },
    select: {
      id: true,
      name: true,
      userId: true,
    },
  });
}

export async function createTestBrand(storeId: string, overrides = {}) {
  return await prisma.brand.create({
    data: {
      name: "Test Brand",
      storeId,
      ...overrides,
    },
    select: { id: true, name: true },
  });
}

export async function createTestProduct(
  storeId: string,
  productTypeId: string,
  brandId: string,
  overrides = {},
) {
  return await prisma.product.create({
    data: {
      name: "Test Product",
      storeId,
      productTypeId,
      brandId,
      slug: `test-product-${Date.now()}`,
      ...overrides,
    },
    select: { id: true, name: true },
  });
}

export async function createTestLogo(storeId: string, overrides = {}) {
  return await prisma.logo.create({
    data: {
      storeId,
      url: "https://example.com/logo.png",
      fileId: `file-${Date.now()}`,
      ...overrides,
    },
    select: { id: true, url: true, fileId: true },
  });
}
