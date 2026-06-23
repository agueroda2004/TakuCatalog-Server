import type { Request, Response, NextFunction } from "express";
import { productService } from "../services/product.service";
import { apiResponse } from "../utils/apiResponse";

export const productController = {
  async createProduct(req: Request, res: Response) {
    const product = await productService.createProduct(req.body, req.userId);
    apiResponse.success(res, 201, product, "Product created successfully");
  },
  async updateProduct(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const product = await productService.updateProduct(
      { id, ...req.body },
      req.userId,
    );
    apiResponse.success(res, 200, product, "Product updated successfully");
  },
  async deleteProduct(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const deletedProduct = await productService.deleteProduct(id, req.userId);
    apiResponse.noContent(
      res,
      201,
      `Product ${deletedProduct} successfully deleted`,
    );
  },
  async getProductsByStoreId(req: Request, res: Response) {
    const { storeId } = req.params as { storeId: string };
    const products = await productService.getProductsByStoreId(storeId);
    apiResponse.success(res, 200, products, "Products retrieved successfully");
  },
  async getProductById(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const product = await productService.getProductById(id);
    apiResponse.success(res, 200, product, "Product retrieved successfully");
  },
};
