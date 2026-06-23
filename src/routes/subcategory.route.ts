import { Router } from "express";
import type { ISubCategoryService } from "../services/interfaces/subcategory.interface";
import { subCategoryController } from "../controllers/subCategory.controller";
import { requireAuth } from "../middlewares/requireAuth.middleware";
import { validateSchema } from "../middlewares/validateSchema";
import { SubCategorySchema } from "../schemas/subcategory.schema";

export function subCategoryRoute(subCategoryService: ISubCategoryService) {
  const router = Router();
  const controller = new subCategoryController(subCategoryService);

  router.post(
    "/",
    requireAuth,
    validateSchema(SubCategorySchema.createSubCategory),
    controller.createSubCategory,
  );

  router.patch(
    "/:id",
    requireAuth,
    validateSchema(SubCategorySchema.updateSubCategory),
    controller.updateSubCategory,
  );

  router.delete(
    "/:id",
    requireAuth,
    validateSchema(SubCategorySchema.deleteSubCategory),
    controller.deleteSubCategory,
  );

  router.get(
    "/store/:storeId",
    validateSchema(SubCategorySchema.getSubCategoriesByStore),
    controller.getSubCategoriesByStore,
  );

  return router;
}
