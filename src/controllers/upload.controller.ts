import { uploadService, deleteImageService } from "../services/upload.service";
import { apiResponse } from "../utils/apiResponse";

export const getAuthParams = async (req: any, res: any) => {
  const authParams = uploadService.generateSignedUrl(
    req.params.storeId,
    req.params.folderName,
  );
  return apiResponse.success(
    res,
    200,
    authParams,
    "Auth params generated successfully",
  );
};
export const deleteImage = async (req: any, res: any) => {
  const { fileId } = req.params;
  const result = await deleteImageService(fileId);

  if (!result) {
    return apiResponse.error(res, 500, "Failed to delete image from ImageKit");
  }
};
