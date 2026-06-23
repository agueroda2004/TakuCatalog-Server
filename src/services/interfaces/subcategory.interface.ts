import type { PaginatedResponse } from "../../types/pagination";
import type {
  CreateSubCategoryDTO,
  GetSubCategoriesByStoreQuery,
  SubCategory,
  UpdateSubCategoryDTO,
  UpdateSubCategoryPayload,
} from "../../types/subcategory";

export interface ISubCategoryService {
  createSubCategory(
    data: CreateSubCategoryDTO,
    requesterId: string,
  ): Promise<void>;
  updateSubCategory(
    id: string,
    data: UpdateSubCategoryPayload,
    requesterId: string,
    storeId: string,
  ): Promise<void>;
  deleteSubCategory(
    id: string,
    requesterId: string,
    storeId: string,
  ): Promise<void>;
  getSubCategoriesByStore(
    storeId: string,
    filters: GetSubCategoriesByStoreQuery,
  ): Promise<PaginatedResponse<SubCategory>>;
}
