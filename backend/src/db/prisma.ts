import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

// dotenv.config({
//   path:"../.env"
// });

const connectionString = env.DATABASE_URL;

console.log(env.DATABASE_URL)
if(!connectionString){
  throw new Error("DATABASE_URL is not configured")
}
const adapter = new PrismaPg({connectionString});

export const prisma = new PrismaClient({
  adapter,
  log: ["warn", "error"]
});
