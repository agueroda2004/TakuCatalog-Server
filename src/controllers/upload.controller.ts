import { uploadService, deleteImageService } from "../services/upload.service";
import { apiResponse } from "../utils/apiResponse";

export const getAuthParams = async (req: any, res: any) => {
  const authParams = uploadService.generateSignedUrl(
    req.params.storeId,
    req.params.folderName,
  );
  return apiResponse.success({
    res,
    status: 200,
    data: authParams,
  });
};
export const deleteImage = async (req: any, res: any) => {
  const { fileId } = req.params;
  await deleteImageService(fileId);
};
