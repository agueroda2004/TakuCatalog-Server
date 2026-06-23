import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.middleware";
import { getAuthParams, deleteImage } from "../controllers/upload.controller";

const router = Router();

router.get("/:storeId/auth/:folderName", requireAuth, getAuthParams);
router.delete("/:storeId/file/:fileId", requireAuth, deleteImage);

export default router;
