import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../validate.js";

describe("validate middleware", () => {
  const mockRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };
  const mockNext: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const passSchema = z.object({ name: z.string() });
  const failSchema = z.object({ age: z.number() });

  it("replaces req.body and calls next on valid body", () => {
    const req = { body: { name: "test" } } as Request;
    const res = mockRes();

    validate(passSchema, "body")(req, res, mockNext);

    expect(req.body).toEqual({ name: "test" });
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("attaches to req.validatedQuery and calls next on valid query", () => {
    const req = { query: { name: "test" } } as unknown as Request;
    const res = mockRes();

    validate(passSchema, "query")(req, res, mockNext);

    expect(req.validatedQuery).toEqual({ name: "test" });
    expect(mockNext).toHaveBeenCalled();
  });

  it("returns 400 with flattened errors on invalid body", () => {
    const req = { body: { age: "not-a-number" } } as Request;
    const res = mockRes();

    validate(failSchema, "body")(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Validation failed",
        errors: expect.any(Object),
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
});
