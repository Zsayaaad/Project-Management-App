import jwt from "jsonwebtoken";

export const generateToken = (
  payload: object,
  secret: string,
  expiresIn: string,
) => {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret);
};
