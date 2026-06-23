import type { NextFunction, Request, Response } from "express";
import type { IProductService } from "../services/interfaces/product.interface";
import type { CreateProductPayload } from "../types/product";
import { apiResponse } from "../utils/apiResponse";

export class ProductController {
  constructor(private productService: IProductService) {}

  createProduct = async (req: Request, res: Response, _next: NextFunction) => {
    const data = req.body as CreateProductPayload;

    await this.productService.createProduct(data, req.userId);

    apiResponse.noContent(res);
  };
}
