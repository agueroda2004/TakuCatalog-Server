import type { NextFunction, Request, Response } from "express";
import type { IProductService } from "../services/interfaces/product.interface";
import type {
  CreateProductPayload,
  DeleteProductParams,
  GetProductsByStoreParams,
  GetProductsByStoreQuery,
  UpdateProductParams,
  UpdateProductPayload,
} from "../types/product";
import { apiResponse } from "../utils/apiResponse";

export class ProductController {
  constructor(private productService: IProductService) {}

  createProduct = async (req: Request, res: Response, _next: NextFunction) => {
    const data = req.body as CreateProductPayload;

    await this.productService.createProduct(data, req.userId);

    apiResponse.noContent(res);
  };

  updateProduct = async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params as UpdateProductParams;
    const data = req.body as Omit<UpdateProductPayload, "id">;

    await this.productService.updateProduct({ id, ...data }, req.userId);

    apiResponse.noContent(res);
  };

  deleteProduct = async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params as DeleteProductParams;

    await this.productService.deleteProduct(id, req.userId);

    apiResponse.noContent(res);
  };

  getProductsByStore = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const params = req.params as GetProductsByStoreParams;
    const query = req.query as unknown as GetProductsByStoreQuery;

    const data = await this.productService.getProductsByStore(
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
