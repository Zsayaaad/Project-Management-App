import bcrypt from "bcryptjs";
import { comparePassword, hashPassword } from "../hash.js";

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockHash = bcrypt.hash as jest.MockedFunction<
  (s: string, salt: number | string) => Promise<string>
>;
const mockCompare = bcrypt.compare as jest.MockedFunction<
  (s: string, hash: string) => Promise<boolean>
>;

describe("Hash Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("hashPassword", () => {
    it("calls bcrypt.hash with password and 12 salt rounds", async () => {
      const password = "password123";
      const hashedPassword = "hashed-password";
      mockHash.mockResolvedValueOnce(hashedPassword);

      const result = await hashPassword(password);

      expect(mockHash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });

    it("propagates errors from bcrypt", async () => {
      const password = "password123";
      mockHash.mockRejectedValueOnce(new Error("Bcrypt error"));

      await expect(hashPassword(password)).rejects.toThrow("Bcrypt error");
    });
  });

  describe("comparePassword", () => {
    it("calls bcrypt.compare with password and hash", async () => {
      const password = "password123";
      const hash = "hashed-password";
      mockCompare.mockResolvedValueOnce(true);

      const result = await comparePassword(password, hash);

      expect(mockCompare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it("returns false when passwords do not match", async () => {
      const password = "wrong-password";
      const hash = "hashed-password";
      mockCompare.mockResolvedValueOnce(false);

      const result = await comparePassword(password, hash);

      expect(result).toBe(false);
    });
  });
});
