import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  ConflictError,
  CustomError,
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
} from "./customErrors.js";

describe("Custom Errors", () => {
  it("should create a base CustomError", () => {
    const error = new CustomError("Base error", 418);
    expect(error.message).toBe("Base error");
    expect(error.statusCode).toBe(418);
    expect(error instanceof Error).toBe(true);
  });

  it("should create a NotFoundError with 404 status", () => {
    const error = new NotFoundError("Resource missing");
    expect(error.name).toBe("NotFoundError");
    expect(error.message).toBe("Resource missing");
    expect(error.statusCode).toBe(StatusCodes.NOT_FOUND);
  });

  it("should create a BadRequestError with 400 status", () => {
    const error = new BadRequestError("Invalid input");
    expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it("should create an UnauthenticatedError with 401 status", () => {
    const error = new UnauthenticatedError("Token missing");
    expect(error.statusCode).toBe(StatusCodes.UNAUTHORIZED);
  });

  it("should create an UnauthorizedError with 403 status", () => {
    const error = new UnauthorizedError("Admin only");
    expect(error.statusCode).toBe(StatusCodes.FORBIDDEN);
  });

  it("should create a ConflictError with 409 status", () => {
    const error = new ConflictError("Email exists");
    expect(error.statusCode).toBe(StatusCodes.CONFLICT);
  });
});
