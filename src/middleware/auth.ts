import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

interface User {
  userId: number;
  iat: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];

  // Bearer {token}
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({
      message: "not found token...",
    });
    return;
  }

  jwt.verify(token, process.env.SERVER_SECRET_KEY!, (error, decoded) => {
    if (error) {
      res.status(403).json({ message: "invalid token..." });
      return;
    }
    req.user = decoded as User;
    next();
  });
}
