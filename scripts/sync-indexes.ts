import mongoose from "mongoose";
import { loadEnvConfig } from "@next/env";
import { connectToDatabase } from "../src/lib/mongodb";
import { PasswordResetTokenModel, RateLimitModel, SessionModel, UserModel } from "../src/modules/auth/models";
import { WeddingMemberModel, WeddingModel } from "../src/modules/weddings/models";
import { MemberInviteModel } from "../src/modules/members/models";
import { EventModel } from "../src/modules/events/models";
import { EventGuestModel, GuestModel } from "../src/modules/guests/models";
import { GuestInvitationModel } from "../src/modules/invitations/models";

loadEnvConfig(process.cwd());

async function main() {
  await connectToDatabase();
  const results = await Promise.all([
    UserModel.syncIndexes(),
    SessionModel.syncIndexes(),
    PasswordResetTokenModel.syncIndexes(),
    RateLimitModel.syncIndexes(),
    WeddingModel.syncIndexes(),
    WeddingMemberModel.syncIndexes(),
    MemberInviteModel.syncIndexes(),
    EventModel.syncIndexes(),
    GuestModel.syncIndexes(),
    EventGuestModel.syncIndexes(),
    GuestInvitationModel.syncIndexes(),
  ]);

  console.log("Application indexes synchronized.", results);
}

main()
  .catch((error) => {
    console.error("Could not synchronize application indexes.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
