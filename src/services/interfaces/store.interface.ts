import type {
  CreateStoreDTO,
  DeleteLogoFromImageKitDTO,
  HasStoreResponse,
  StoreResponse,
  UpdateLogoStoreDTO,
  UpdateStoreDTO,
} from "../../types/store";

export interface IStoreService {
  createStore(data: CreateStoreDTO, userId: string): Promise<StoreResponse>;
  updateLogoStore(data: UpdateLogoStoreDTO): Promise<void>;
  hasStore(userId: string): Promise<HasStoreResponse>;
  updateStore(data: UpdateStoreDTO): Promise<void>;
  deleteLogoFromImageKit(
    data: DeleteLogoFromImageKitDTO,
    requesterId: string,
  ): Promise<void>;
}
