import mongoose from "mongoose";

const globalForMongoose = globalThis as unknown as {
  mongooseConn?: Promise<typeof mongoose>;
};

export function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (see .env.example)");
  // Reuse one connection across hot reloads and route invocations.
  globalForMongoose.mongooseConn ??= mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });
  return globalForMongoose.mongooseConn;
}
