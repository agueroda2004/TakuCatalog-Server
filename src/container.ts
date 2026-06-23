import { ProductRepository } from "./repositories/product.repository";
import { ProductTypeRepository } from "./repositories/productType.repository";
import { SubCategoryRepository } from "./repositories/subcategory.repository";
import type { IProductService } from "./services/interfaces/product.interface";
import type { IProductTypeService } from "./services/interfaces/productType.interface";
import type { IStoreService } from "./services/interfaces/store.interface";
import type { ISubCategoryService } from "./services/interfaces/subcategory.interface";
import { ProductService } from "./services/productNew.service";
import { ProductTypeService } from "./services/productType.service";
import { storeService } from "./services/store.service";
import { SubCategoryService } from "./services/subcategory.service";

export interface Container {
  storeService: IStoreService;
  productTypeService: IProductTypeService;
  subCategoryService: ISubCategoryService;
  productService: IProductService;
}

export function createContainer(): Container {
  return {
    storeService: new storeService(),
    productTypeService: new ProductTypeService(),
    subCategoryService: new SubCategoryService(),
    productService: new ProductService(
      new ProductRepository(),
      new ProductTypeRepository(),
      new SubCategoryRepository(),
    ),
  };
}
