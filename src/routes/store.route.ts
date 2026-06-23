import { Router } from "express";
import { validateSchema } from "../middlewares/validateSchema";
import { StoreSchema } from "../schemas/store.schema";
import { storeController } from "../controllers/store.controller";
import { requireAuth } from "../middlewares/requireAuth.middleware";
import type { IStoreService } from "../services/interfaces/store.interface";

export function storeRoute(storeService: IStoreService) {
  const router = Router();
  const controller = new storeController(storeService);

  router.post(
    "/",
    requireAuth,
    validateSchema(StoreSchema.createStore),
    controller.createStoreController,
  );

  router.patch(
    "/:storeId/logo",
    requireAuth,
    validateSchema(StoreSchema.updateLogoStore),
    controller.updateLogoStoreController,
  );

  router.patch(
    "/:storeId",
    requireAuth,
    validateSchema(StoreSchema.updateStore),
    controller.updateStoreController,
  );

  router.get("/has-store", requireAuth, controller.hasStoreController);

  router.delete(
    "/:storeId/logo/:fileId",
    requireAuth,
    validateSchema(StoreSchema.deleteLogoFromImageKit),
    controller.deleteLogoFromImageKitController,
  );

  return router;
}
