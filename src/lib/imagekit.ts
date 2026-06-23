import "dotenv/config";
import ImageKit from "imagekit";

const imageKit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});

export const generateAuthParams = (storeId: string, folderName: string) => {
  const authParams = imageKit.getAuthenticationParameters();

  return {
    ...authParams,
    folder: `stores/${storeId}/${folderName}`,
    fileName: `logo-${Date.now()}-${storeId}`,
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
  };
};

export const deleteImage = async (fileId: string): Promise<void> => {
  const result = await imageKit.deleteFile(fileId);

  if (!result) {
    console.error("ImageKit deletion returned unexpected result", {
      fileId,
      result,
    });
  }
};

export default imageKit;
