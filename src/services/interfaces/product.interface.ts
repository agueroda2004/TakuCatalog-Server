import type { CreateProductPayload } from "../../types/product";

export interface IProductService {
  createProduct(data: CreateProductPayload, requesterId: string): Promise<void>;
}
