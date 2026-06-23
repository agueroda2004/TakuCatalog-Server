import { Router } from "express";
import type { IProductService } from "../services/interfaces/product.interface";
import { ProductController } from "../controllers/productNew.controller";
import { requireAuth } from "../middlewares/requireAuth.middleware";
import { validateSchema } from "../middlewares/validateSchema";
import { CreateProductSchema } from "../schemas/product.schema";

export function productRoute(productService: IProductService) {
  const router = Router();
  const controller = new ProductController(productService);

  router.post(
    "/",
    requireAuth,
    validateSchema(CreateProductSchema),
    controller.createProduct,
  );

  return router;
}
