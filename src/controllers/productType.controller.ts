import type { NextFunction, Response, Request } from "express";
import { apiResponse } from "../utils/apiResponse";
import type { IProductTypeService } from "../services/interfaces/productType.interface";
import type {
  CreateProductTypeDTO,
  DeleteProductTypeParams,
  GetProductTypesByStoreDropdownParams,
  GetProductTypesByStoreParams,
  GetProductTypesByStoreQuery,
  UpdateProductTypeDTO,
  UpdateProductTypeParams,
} from "../types/productType";

export class productTypeController {
  constructor(private productTypeService: IProductTypeService) {}

  createProductType = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const data = req.body as CreateProductTypeDTO;

    await this.productTypeService.createProductType(data, req.userId);

    apiResponse.noContent(res);
  };

  updateProductType = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const params = req.params as UpdateProductTypeParams;
    const data = req.body as UpdateProductTypeDTO;

    await this.productTypeService.updateProductType(
      params.id,
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
    const params = req.params as DeleteProductTypeParams;

    await this.productTypeService.deleteProductType(params.id, req.userId);

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
