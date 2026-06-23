import express, {
  type Application,
  type NextFunction,
  type Router,
  type Request,
  type Response,
} from "express";
import CustomError from "../errors/customError";

export function createTestApp(routes: Router): Application {
  const app = express();
  app.use(express.json());
  app.use(routes);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof CustomError) {
      return res.status(err.statusCode).json(err.toJSON());
    } else {
      return res.status(500).json({
        message: "Internal Server Error",
      });
    }
  });

  return app;
}
