import type { NextFunction, Response, Request } from "express";
import { brandService } from "../services/brand.service";
import { apiResponse } from "../utils/apiResponse";

export const brandController = {
  async createBrand(req: Request, res: Response, next: NextFunction) {
    const { name, storeId } = req.body;
    const brand = await brandService.createBrand({ name, storeId }, req.userId);
    apiResponse.success(res, 201, brand, "Brand created successfully");
  },
  async updateBrand(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params as { id: string };

    const updatedBrand = await brandService.updateBrand(
      { id, ...req.body },
      req.userId,
    );

    apiResponse.success(res, 200, updatedBrand, "Brand updated successfully");
  },
  async deleteBrand(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params as { id: string };
    const deletedBrand = await brandService.deleteBrand(id, req.userId);

    apiResponse.noContent(
      res,
      200,
      `Brand ${deletedBrand} successfully deleted`,
    );
  },
  async getBrands(req: Request, res: Response, next: NextFunction) {
    const { storeId } = req.query as { storeId: string };
    const brands = await brandService.getBrandsByStore(storeId);
    apiResponse.success(res, 200, brands, "Brands retrieved successfully");
  },
  async getBrandById(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params as { id: string };
    const brand = await brandService.getBrandById(id);
    apiResponse.success(res, 200, brand, "Brand retrieved successfully");
  },
};
