import mongoose from "mongoose";

// One shared connection, reused across requests (needed on Vercel, where the
// server code runs as short-lived functions instead of one long-running process).
export function connectDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  if (!globalThis.__debugshMongo) {
    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/debugsh";
    const dbName = process.env.MONGODB_DB || "debugsh";
    globalThis.__debugshMongo = mongoose
      .connect(uri, { dbName, serverSelectionTimeoutMS: 10000 })
      .catch((err) => {
        globalThis.__debugshMongo = undefined; // allow a retry on the next request
        throw err;
      });
  }
  return globalThis.__debugshMongo;
}
