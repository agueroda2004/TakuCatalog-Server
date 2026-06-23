import type { NextFunction, Response, Request } from "express";
import { apiResponse } from "../utils/apiResponse";
import type { IProductTypeService } from "../services/interfaces/productType.interface";
import type {
  GetProductTypesByStoreDropdownParams,
  GetProductTypesByStoreParams,
  GetProductTypesByStoreQuery,
  UpdateProductTypePayload,
} from "../types/productType";
import type { CreateProductPayload } from "../types/product";

export class productTypeController {
  constructor(private productTypeService: IProductTypeService) {}

  createProductType = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const data = req.body as CreateProductPayload;

    await this.productTypeService.createProductType(data, req.userId);

    apiResponse.noContent(res);
  };

  updateProductType = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const params = req.params as { id: string; storeId: string };
    const data = req.body as UpdateProductTypePayload;

    await this.productTypeService.updateProductType(
      params.id,
      params.storeId,
      data,
      req.userId,
    );

    apiResponse.noContent(res);
  };

  deleteProductType = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const params = req.params as { id: string; storeId: string };

    await this.productTypeService.deleteProductType(
      params.id,
      params.storeId,
      req.userId,
    );

    apiResponse.noContent(res);
  };

  getProductTypes = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const params = req.params as GetProductTypesByStoreParams;
    const query = req.query as unknown as GetProductTypesByStoreQuery;

    const data = await this.productTypeService.getProductTypesByStore(
      params.storeId,
      query,
    );

    apiResponse.success({
      res,
      status: 200,
      data: data,
    });
  };

  getProductTypesByStoreDropdown = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const params = req.params as GetProductTypesByStoreDropdownParams;
    console.log("storeId", params.storeId);
    const data = await this.productTypeService.getProductTypesByStoreDropdown(
      params.storeId,
    );

    apiResponse.success({
      res,
      status: 200,
      data: data,
    });
  };
}
