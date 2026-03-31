import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ledgersRouter from "./ledgers";
import overviewRouter from "./overview";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ledgers", ledgersRouter);
router.use(overviewRouter);

export default router;
