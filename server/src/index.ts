import { config } from "./config.js";
import { createServer } from "./api.js";

const app = createServer();
app.listen(config.port, () => {
  console.log(`[sandforge] api listening on http://localhost:${config.port}`);
  console.log(
    `[sandforge] llm=${process.env.NEBIUS_API_KEY ? "nebius" : "mock"} sandbox=${process.env.NEBIUS_API_KEY && process.env.NEBIUS_PROJECT_ID ? "contree" : "local"}`,
  );
});
