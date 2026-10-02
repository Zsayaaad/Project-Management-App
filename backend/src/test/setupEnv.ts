// This file ensures .env.test is loaded before any module imports happen.

import { config } from "dotenv";
import { resolve } from "node:path";

// Load .env.test explicitly before any other module is imported
config({ path: resolve(process.cwd(), ".env.test") });
