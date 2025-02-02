import { Router } from "express";
import fs from "fs";

const imageRouter = Router();

imageRouter.get("/:id", (req, res) => {
  const { id } = req.params;
  fs.readFileSync;
  console.log();
});

export default imageRouter;
