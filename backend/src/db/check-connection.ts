import { prisma } from "./prisma.js";

async function checkConnection() {
  try {
    const result = await prisma.$queryRaw  <
      { version: string }[]
    >`SELECT version()`;

    console.log("PostgreSQL connected successfully");
    console.log(result[0]?.version);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

checkConnection();
