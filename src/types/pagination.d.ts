export type PaginationResult = {
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: PaginationResult;
};
