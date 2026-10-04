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
  describe("CustomError base class", () => {
    it("creates error with message and status code", () => {
      const error = new CustomError("Test error", 418);

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(418);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("Specific error classes", () => {
    it.each([
      [
        "NotFoundError",
        NotFoundError,
        StatusCodes.NOT_FOUND,
        "Resource not found",
      ],
      [
        "BadRequestError",
        BadRequestError,
        StatusCodes.BAD_REQUEST,
        "Invalid input",
      ],
      [
        "UnauthenticatedError",
        UnauthenticatedError,
        StatusCodes.UNAUTHORIZED,
        "Token missing",
      ],
      [
        "UnauthorizedError",
        UnauthorizedError,
        StatusCodes.FORBIDDEN,
        "Admin only",
      ],
      ["ConflictError", ConflictError, StatusCodes.CONFLICT, "Email exists"],
    ])(
      "%s sets correct status code and message",
      (_name, ErrorClass, expectedCode, message) => {
        const error = new ErrorClass(message);

        expect(error.statusCode).toBe(expectedCode);
        expect(error.message).toBe(message);
        expect(error.name).toBe(_name);
        expect(error instanceof CustomError).toBe(true);
      },
    );
  });
});
