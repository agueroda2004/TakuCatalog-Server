import { Router } from "express";
import { productController } from "../controllers/product.controller";
import { validateSchema } from "../middlewares/validateSchema";
import { ProductSchema } from "../schemas/product.schema";
import { requireAuth } from "../middlewares/requireAuth.middleware";

const router = Router();

router.post(
  "/",
  requireAuth,
  validateSchema(ProductSchema.createProduct),
  productController.createProduct,
);
router.patch(
  "/:id",
  requireAuth,
  validateSchema(ProductSchema.updateProduct),
  productController.updateProduct,
);
router.delete("/:id", requireAuth, productController.deleteProduct);
router.get("/store/:storeId", productController.getProductsByStoreId);
router.get("/:id", productController.getProductById);

export default router;
