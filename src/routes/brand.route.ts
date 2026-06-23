import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.middleware";
import { validateSchema } from "../middlewares/validateSchema";
import { brandSchema } from "../schemas/brand.schema";
import { brandController } from "../controllers/brand.controller";

const router = Router();

router.post(
  "/",
  requireAuth,
  validateSchema(brandSchema.createBrand),
  brandController.createBrand,
);
router.patch(
  "/:id",
  requireAuth,
  validateSchema(brandSchema.updateBrand),
  brandController.updateBrand,
);
router.delete("/:id", requireAuth, brandController.deleteBrand);
router.get("/", brandController.getBrands);
router.get("/:id", brandController.getBrandById);

export default router;
