import { Router } from "express";
import { exec } from "child_process";

const serverRouter = Router();

serverRouter.get("/restart", async (req, res) => {
  exec('pm2 restart 4 --cron-restart="0 0,12 * * *" ');
  res.json({
    ok: true,
    message: "Restart중 입니다...",
  });
});

export default serverRouter;
