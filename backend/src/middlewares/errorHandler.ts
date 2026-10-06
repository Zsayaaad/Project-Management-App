import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { CustomError } from "../errors/customErrors.js";

export const errorHandlerMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.log(err);

  if (err instanceof CustomError) {
    const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const msg = err.message || "something went wrong, try later!";
    res.status(statusCode).json({ msg: msg });
  }

  // Catch-all for unexpected standard Errors (TypeError, DB crashes, etc.)
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    msg: "Internal server error",
  });
};
