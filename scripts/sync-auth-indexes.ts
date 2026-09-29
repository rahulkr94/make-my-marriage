import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/mongodb";
import { PasswordResetTokenModel, RateLimitModel, SessionModel, UserModel } from "../src/modules/auth/models";

async function main() {
  await connectToDatabase();
  const results = await Promise.all([
    UserModel.syncIndexes(),
    SessionModel.syncIndexes(),
    PasswordResetTokenModel.syncIndexes(),
    RateLimitModel.syncIndexes(),
  ]);

  console.log("Authentication indexes synchronized.", results);
}

main()
  .catch((error) => {
    console.error("Could not synchronize authentication indexes.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
