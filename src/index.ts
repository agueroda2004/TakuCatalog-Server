import express from "express";
import "dotenv/config";
import uploadRoutes from "./routes/upload.route";
import brandRoutes from "./routes/brand.route";
import handlerError from "./middlewares/handlerError.middleware";
import { clerkMiddleware, verifyToken } from "@clerk/express";
import "./instrument";
import cors from "cors";
import { getAuth } from "@clerk/express";
import { createContainer } from "./container";
import { productTypeRoute } from "./routes/productType.route";
import { storeRoute } from "./routes/store.route";
import { subCategoryRoute } from "./routes/subcategory.route";
import { productRoute } from "./routes/productNew.route";

const container = createContainer();

const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(clerkMiddleware());
app.use(express.json());

app.use("/store", storeRoute(container.storeService));
app.use("/productType", productTypeRoute(container.productTypeService));
app.use("/subCategory", subCategoryRoute(container.subCategoryService));
app.use("/brand", brandRoutes);
app.use("/product", productRoute(container.productService));
app.use("/upload", uploadRoutes);

// Sentry.setupExpressErrorHandler(app); this cause some issues with the error, because it manage all the errors like Zod and that's because is better to use CustomError.

app.use(handlerError);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
