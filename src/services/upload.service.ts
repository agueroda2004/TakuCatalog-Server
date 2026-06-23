import { generateAuthParams, deleteImage } from "../lib/imagekit";

export const uploadService = {
  generateSignedUrl(storeId: string, folderName: string) {
    return generateAuthParams(storeId, folderName);
  },
};

export const deleteImageService = async (fileId: string) => {
  await deleteImage(fileId);
};
