import { Router } from "express";
import type { IProductService } from "../services/interfaces/product.interface";
import { ProductController } from "../controllers/productNew.controller";
import { requireAuth } from "../middlewares/requireAuth.middleware";
import { validateSchema } from "../middlewares/validateSchema";
import {
  CreateProductSchema,
  ProductSchema,
  UpdateProductSchema,
} from "../schemas/product.schema";

export function productRoute(productService: IProductService) {
  const router = Router();
  const controller = new ProductController(productService);

  router.post(
    "/",
    requireAuth,
    validateSchema(CreateProductSchema),
    controller.createProduct,
  );

  router.patch(
    "/:id",
    requireAuth,
    validateSchema(UpdateProductSchema),
    controller.updateProduct,
  );

  router.delete(
    "/:id",
    requireAuth,
    validateSchema(ProductSchema.deleteProduct),
    controller.deleteProduct,
  );

  router.get(
    "/store/:storeId",
    requireAuth,
    validateSchema(ProductSchema.getProductsByStore),
    controller.getProductsByStore,
  );

  return router;
}
