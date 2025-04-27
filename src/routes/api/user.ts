import db from "@services/database";
import { Router } from "express";

const userRouter = Router();

interface LoginBody {
  email: string;
}

userRouter.post("/log-in", async (req, res) => {
  const { email } = req.body as LoginBody;

  const user = await db.user.findUnique({
    where: {
      email: email,
    },
  });

  if (user) {
    res.json({
      ok: true,
      user: user,
    });
  } else {
    res.json({
      ok: false,
      error: "not found user.",
    });
  }
});

export default userRouter;
