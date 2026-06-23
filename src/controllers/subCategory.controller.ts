import type { NextFunction, Request, Response } from "express";
import type { ISubCategoryService } from "../services/interfaces/subcategory.interface";

import { apiResponse } from "../utils/apiResponse";
import type {
  CreateSubCategoryPayload,
  GetSubCategoriesByStoreParams,
  GetSubCategoriesByStoreQuery,
  UpdateSubCategoryPayload,
} from "../types/subcategory";

export class subCategoryController {
  constructor(private subCategoryService: ISubCategoryService) {}

  createSubCategory = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const data = req.body as CreateSubCategoryPayload;

    await this.subCategoryService.createSubCategory(data, req.userId);

    apiResponse.noContent(res);
  };

  updateSubCategory = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const params = req.params as { id: string; storeId: string };
    const data = req.body as UpdateSubCategoryPayload;

    await this.subCategoryService.updateSubCategory(
      params.id,
      data,
      req.userId,
      params.storeId,
    );

    apiResponse.noContent(res);
  };

  deleteSubCategory = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const params = req.params as { id: string; storeId: string };

    await this.subCategoryService.deleteSubCategory(
      params.id,
      req.userId,
      params.storeId,
    );

    apiResponse.noContent(res);
  };

  getSubCategoriesByStore = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const params = req.params as GetSubCategoriesByStoreParams;
    const query = req.query as unknown as GetSubCategoriesByStoreQuery;

    const data = await this.subCategoryService.getSubCategoriesByStore(
      params.storeId,
      query,
    );

    apiResponse.success({
      res,
      status: 200,
      data: data,
    });
  };
}
