import { db } from "../src/lib/db";

async function checkAndFix() {
  console.log("Checking SQLite database schema...");
  const tableInfo: any = await db.$queryRawUnsafe("PRAGMA table_info(ClientProject);");
  console.log("ClientProject Columns:", tableInfo);

  const columnNames = tableInfo.map((col: any) => col.name);
  console.log("Existing columns in ClientProject:", columnNames);

  if (!columnNames.includes("code")) {
    console.log("Adding missing column 'code' to ClientProject...");
    await db.$queryRawUnsafe("ALTER TABLE ClientProject ADD COLUMN code TEXT;");
    console.log("[✓] Column 'code' successfully added to ClientProject!");
  } else {
    console.log("[✓] Column 'code' already exists.");
  }

  // Check requirementRequestId
  if (!columnNames.includes("requirementRequestId")) {
    console.log("Adding missing column 'requirementRequestId' to ClientProject...");
    await db.$queryRawUnsafe("ALTER TABLE ClientProject ADD COLUMN requirementRequestId TEXT;");
    console.log("[✓] Column 'requirementRequestId' added to ClientProject!");
  }

  // Check proposalVersion
  if (!columnNames.includes("proposalVersion")) {
    console.log("Adding missing column 'proposalVersion' to ClientProject...");
    await db.$queryRawUnsafe("ALTER TABLE ClientProject ADD COLUMN proposalVersion INTEGER;");
    console.log("[✓] Column 'proposalVersion' added to ClientProject!");
  }

  // Also check ClientTask table
  const taskTableInfo: any = await db.$queryRawUnsafe("PRAGMA table_info(ClientTask);");
  const taskColumnNames = taskTableInfo.map((col: any) => col.name);
  console.log("Existing columns in ClientTask:", taskColumnNames);

  if (!taskColumnNames.includes("code")) {
    console.log("Adding missing column 'code' to ClientTask...");
    await db.$queryRawUnsafe("ALTER TABLE ClientTask ADD COLUMN code TEXT;");
    console.log("[✓] Column 'code' added to ClientTask!");
  }

  if (!taskColumnNames.includes("layer")) {
    console.log("Adding missing column 'layer' to ClientTask...");
    await db.$queryRawUnsafe("ALTER TABLE ClientTask ADD COLUMN layer TEXT DEFAULT 'BACKEND';");
    console.log("[✓] Column 'layer' added to ClientTask!");
  }

  console.log("[✓] Database schema verified and synchronized!");
}

checkAndFix()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error during check and fix:", err);
    process.exit(1);
  });
