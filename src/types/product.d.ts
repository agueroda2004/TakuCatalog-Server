export type CreateProductPayload = {
  name: string;
  description?: string;
  storeId: string;
  productTypeId: string;
  subCategoryId: string;

  // Image creation
  image: {
    url: string;
    fileId: string;
  };

  // Product Variants creation
  variants: {
    name: string;
    price: number;
    stock?: number;
  }[];
};
