import jwt from "jsonwebtoken";

export const generateToken = (
  payload: object,
  secret: string,
  expiresIn: string,
) => {
  const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  return token;
};

export const verifyToken = (token: string, secret: string) => {
  const decoded = jwt.verify(token, secret);
  return decoded;
};
