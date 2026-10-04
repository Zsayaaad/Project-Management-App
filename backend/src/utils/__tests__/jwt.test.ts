import jwt from "jsonwebtoken";
import { generateToken, verifyToken } from "../jwt.js";

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

const mockSign = jwt.sign as unknown as jest.Mock;
const mockVerify = jwt.verify as unknown as jest.Mock;

describe("JWT Utilities", () => {
  const mockPayload = { userId: "123", role: "ADMIN" };
  const mockSecret = "super-secret-test-key";
  const mockExpiry = "7d";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateToken", () => {
    it("calls jwt.sign with correct payload, secret, and options", () => {
      const token = "mocked-token";
      mockSign.mockReturnValue(token);

      const result = generateToken(mockPayload, mockSecret, mockExpiry);

      expect(result).toBe(token);
      expect(mockSign).toHaveBeenCalledWith(mockPayload, mockSecret, {
        expiresIn: mockExpiry,
      });
    });
  });

  describe("verifyToken", () => {
    it("calls jwt.verify with token and secret", () => {
      const decodedPayload = { userId: "123", iat: 123456 };
      mockVerify.mockReturnValue(decodedPayload);

      const result = verifyToken("valid-token", mockSecret);

      expect(result).toEqual(decodedPayload);
      expect(mockVerify).toHaveBeenCalledWith("valid-token", mockSecret);
    });

    it("throws error when token is invalid or expired", () => {
      mockVerify.mockImplementation(() => {
        throw new Error("jwt expired");
      });

      expect(() => verifyToken("expired-token", mockSecret)).toThrow(
        "jwt expired",
      );
    });
  });
});
