import app from "./app.js";
import { connectDb } from "./db.js";

// Local development / `npm start`. (On Vercel, api/index.js is used instead.)
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => console.log(`[api] Express listening on http://localhost:${PORT}`));

connectDb()
  .then(() => console.log(`[db] MongoDB connected (database: ${process.env.MONGODB_DB || "debugsh"})`))
  .catch((err) => {
    console.error("[db] Could not connect to MongoDB:", err.message);
    console.error("[db] Check MONGODB_URI in .env (and Atlas Network Access / your password).");
  });
