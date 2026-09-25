import jwt from "jsonwebtoken";
import { generateToken, verifyToken } from "../jwt.js";

// Mock the 3rd party lib
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

describe("JWT Utilities", () => {
  const mockPayload = { userId: "123", role: "ADMIN" };
  const mockSecret = "super-secret-test-key";
  const mockExpiry = "7d";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateToken", () => {
    it("should call jwt.sign with correct payload, secret, and options", () => {
      (jwt.sign as jest.Mock).mockReturnValue("mocked-token");

      const token = generateToken(mockPayload, mockSecret, mockExpiry);

      expect(token).toBe("mocked-token");
      expect(jwt.sign).toHaveBeenCalledTimes(1);
      expect(jwt.sign).toHaveBeenCalledWith(mockPayload, mockSecret, {
        expiresIn: mockExpiry,
      });
    });
  });

  describe("verifyToken", () => {
    it("should call jwt.verify with token and secret", () => {
      const decodedPayload = { userId: "123", iat: 123456 };
      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);

      const result = verifyToken("valid-token", mockSecret);

      expect(result).toEqual(decodedPayload);
      expect(jwt.verify).toHaveBeenCalledWith("valid-token", mockSecret);
    });

    it("should throw an error if token is invalid or expired", () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("jwt expired");
      });

      expect(() => verifyToken("expired-token", mockSecret)).toThrow(
        "jwt expired",
      );
    });
  });
});
