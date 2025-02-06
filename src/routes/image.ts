import { Router } from "express";
import path from "path";
import fs from "fs";

const imageRouter = Router();

imageRouter.get("/:id", (req, res) => {
  const { id } = req.params;
  const imagePath = path.join("public", "image", id);
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath, { root: "." });
  } else {
    res.status(404).send("Not found error.");
  }
});

export default imageRouter;
