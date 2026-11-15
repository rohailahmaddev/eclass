import express from "express";
import v1Routes from "./routes/v1/index.js"

const app = express();

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));

app.use("/api/v1", v1Routes)

export default app;
