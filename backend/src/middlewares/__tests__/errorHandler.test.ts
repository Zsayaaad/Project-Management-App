import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { errorHandlerMiddleware } from "../errorHandler.js";
import { NotFoundError } from "../../errors/customErrors.js";

describe("errorHandlerMiddleware", () => {
  const mockReq = {} as Request;
  const mockNext: NextFunction = jest.fn();

  const mockRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  it("sends status and message for CustomError", () => {
    const error = new NotFoundError("Resource missing");
    const res = mockRes();

    errorHandlerMiddleware(error, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({ msg: "Resource missing" });
  });

  it("returns 500 Internal Server Error for non-CustomError", () => {
    const error = new Error("Random crash");
    const res = mockRes();

    errorHandlerMiddleware(error, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({ msg: "Internal server error" });
  });
});
