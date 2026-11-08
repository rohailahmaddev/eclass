import express from "express";

const app = express();

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "eClass API is running",
    service: "eclass-api"
  });
});

export default app;