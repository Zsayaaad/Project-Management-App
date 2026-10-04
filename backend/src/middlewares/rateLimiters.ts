import RedisStore, { RedisReply } from "rate-limit-redis";
import { redisClient } from "../lib/redis.js";
import rateLimit from "express-rate-limit";

const redisStore = (prefix: string) =>
  new RedisStore({
    prefix, // isolates counters per limiter
    sendCommand: (command: string, ...args: string[]) =>
      redisClient.call(command, ...args) as Promise<RedisReply>,
  });

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,

  // Use Redis to share rate limits across restarts/instances
  store: new RedisStore({
    prefix: "rl:auth:", // ADD THIS so it doesn't share counters with the others
    // ioredis types mismatch with rate-limit-redis generic
    sendCommand: (command: string, ...args: string[]) =>
      redisClient.call(command, ...args) as Promise<RedisReply>,
  }),
  message: { msg: "IP rate limit exceeded, retry in 15min" },
});

// Global safely net for the whole API: 300 req / 15 min / IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore("rl:global:"),
  message: { msg: "Too many requests, please slow down." },
});

// Strict limiter for expensive/sensitive actions: 10 req / 15 min / IP
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore("rl:sensitive:"),
  message: { msg: "Rate limit exceeded for this action, retry later." },
});
