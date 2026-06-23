import type { NextFunction, Request, Response } from "express";
import type { ISubCategoryService } from "../services/interfaces/subcategory.interface";

import { apiResponse } from "../utils/apiResponse";
import type {
  CreateSubCategoryDTO,
  DeleteSubCategoryParams,
  GetSubCategoriesByStoreParams,
  GetSubCategoriesByStoreQuery,
  UpdateSubCategoryDTO,
  UpdateSubCategoryParams,
} from "../types/subcategory";

export class subCategoryController {
  constructor(private subCategoryService: ISubCategoryService) {}

  createSubCategory = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const data = req.body as CreateSubCategoryDTO;

    await this.subCategoryService.createSubCategory(data, req.userId);

    apiResponse.noContent(res);
  };

  updateSubCategory = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const params = req.params as UpdateSubCategoryParams;
    const data = req.body as UpdateSubCategoryDTO;

    await this.subCategoryService.updateSubCategory(
      params.id,
      data,
      req.userId,
    );

    apiResponse.noContent(res);
  };

  deleteSubCategory = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const params = req.params as DeleteSubCategoryParams;

    await this.subCategoryService.deleteSubCategory(params.id, req.userId);

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
