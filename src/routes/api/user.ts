import db from "@services/database";
import { Router } from "express";

const userRouter = Router();

interface LoginBody {
  email: string;
}

userRouter.post("/log-in", async (req, res) => {
  const { email } = req.body as LoginBody;

  const user = await db.user.findFirst({
    where: {
      AND: [{ email: email }, { membership: { expires_at: null } }],
    },
    include: {
      membership: true,
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

userRouter.post("/watch-record", async (req, res) => {
  const { watchId, duration, currentTime } = req.body;
  console.log(watchId, duration, currentTime);

  res.send("ok");
});

export default userRouter;
