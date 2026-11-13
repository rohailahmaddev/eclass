import app from "./app.js";

const PORT = Number(process.env.PORT ?? 8000);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`eClass API running on port ${PORT}`);
});

export { server };