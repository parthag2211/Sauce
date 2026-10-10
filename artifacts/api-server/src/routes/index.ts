import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hiringRouter from "./hiring";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/hiring", hiringRouter);

export default router;
