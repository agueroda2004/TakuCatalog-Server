import { Router } from "express";
import { validateSchema } from "../middlewares/validateSchema";
import { ProductTypeSchema } from "../schemas/productType.schema";
import { productTypeController } from "../controllers/productType.controller";
import { requireAuth } from "../middlewares/requireAuth.middleware";
import type { IProductTypeService } from "../services/interfaces/productType.interface";

export function productTypeRoute(productTypeService: IProductTypeService) {
  const router = Router();
  const controller = new productTypeController(productTypeService);

  router.post(
    "/",
    requireAuth,
    validateSchema(ProductTypeSchema.createProductType),
    controller.createProductType,
  );

  router.patch(
    "/:id",
    requireAuth,
    validateSchema(ProductTypeSchema.updateProductType),
    controller.updateProductType,
  );

  router.delete(
    "/:id",
    requireAuth,
    validateSchema(ProductTypeSchema.deleteProductType),
    controller.deleteProductType,
  );

  router.get(
    "/store/:storeId",
    validateSchema(ProductTypeSchema.getProductTypeByStore),
    controller.getProductTypes,
  );
  router.get(
    "/dropdown/:storeId",
    validateSchema(ProductTypeSchema.getProductTypesForDropdown),
    controller.getProductTypesByStoreDropdown,
  );

  return router;
}
