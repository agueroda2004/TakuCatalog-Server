import type { NextFunction, Request, Response } from "express";
import { storeService } from "../services/store.service";
import { apiResponse } from "../utils/apiResponse";
import type {
  DeleteLogoFromImageKitDTO,
  UpdateLogoStoreDTO,
  UpdateStoreDTO,
} from "../types/store";

export class storeController {
  constructor(private storeService: storeService) {}

  createStoreController = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const userId = req.userId;
    const store = await this.storeService.createStore(req.body, userId);
    apiResponse.success({
      res,
      status: 201,
      data: store,
      message: "Store created successfully",
    });
  };

  updateLogoStoreController = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const { storeId } = req.params as { storeId: string };
    const data: UpdateLogoStoreDTO = req.body;

    await this.storeService.updateLogoStore({ ...data, storeId });
    apiResponse.success({
      res,
      status: 200,
      message: "Store logo updated successfully",
    });
  };

  /**
   * Controller function to check if a user already has a store associated with their account.
   */
  hasStoreController = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const userId = req.userId;
    const hasStore = await this.storeService.hasStore(userId);
    apiResponse.success({
      res,
      status: 201,
      message: "Store retrieved successfully",
      data: hasStore,
    });
  };

  updateStoreController = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const { storeId } = req.params as { storeId: string };
    let data: UpdateStoreDTO = { ...req.body, storeId };

    await this.storeService.updateStore(data);
    apiResponse.success({
      res,
      status: 200,
      message: "Store updated successfully",
    });
  };

  deleteLogoFromImageKitController = async (
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    const requesterId = req.userId;
    const data: DeleteLogoFromImageKitDTO =
      req.params as DeleteLogoFromImageKitDTO;

    await this.storeService.deleteLogoFromImageKit(data, requesterId);
    apiResponse.success({
      res,
      status: 200,
      message: "Store logo deleted successfully",
    });
  };
}
