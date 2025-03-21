import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import mongoose from "mongoose";
import { connect } from "../db";
import {
  ActionItemCategory,
  AgendaCategoryModel,
  AppUserProfile,
  Community,
  Event,
  Organization,
  Post,
  User,
  Venue,
} from "../models";
import { RecurrenceRule } from "../models/RecurrenceRule";

const dirname: string = path.dirname(fileURLToPath(import.meta.url));

interface InterfaceArgs {
  items?: string;
  format?: boolean;
  _: unknown;
}

/**
 * Lists sample data files and their document counts in the sample_data directory.
 */
export async function listSampleData(): Promise<void> {
  try {
    const sampleDataPath = path.resolve(dirname, "../../sample_data");
    const files = await fs.readdir(sampleDataPath);

    console.log("Sample Data Files:\n");

    console.log(
      "| File Name".padEnd(30) +
        "| Document Count |\n" +
        "|".padEnd(30, "-") +
        "|----------------|\n",
    );

    for (const file of files) {
      const filePath = path.resolve(sampleDataPath, file);
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        const data = await fs.readFile(filePath, "utf8");
        const docs = JSON.parse(data);
        console.log(
          `| ${file.padEnd(28)}| ${docs.length.toString().padEnd(15)}|`,
        );
      }
    }
    console.log();
  } catch (err) {
    console.error("\x1b[31m", `Error listing sample data: ${err}`);
  }
}

/**
 * Deletes all documents from the collections to reset the database.
 */
async function resetDatabase(): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Community.deleteMany({});
      await User.deleteMany({});
      await Organization.deleteMany({});
      await ActionItemCategory.deleteMany({});
      await AgendaCategoryModel.deleteMany({});
      await Event.deleteMany({});
      await Venue.deleteMany({});
      await RecurrenceRule.deleteMany({});
      await Post.deleteMany({});
      await AppUserProfile.deleteMany({});
    });

    console.log("Database reset completed.");
  } catch (error) {
    console.error("Database reset failed:", error);
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Inserts data into specified collections.
 * @param collections - Array of collection names to insert data into
 */
async function insertCollections(collections: string[]): Promise<void> {
  try {
    // Connect to MongoDB database
    await connect("talawa-api");

    await resetDatabase();

    // Insert data into each specified collection
    for (const collection of collections) {
      const data = await fs.readFile(
        path.resolve(dirname, `../../sample_data/${collection}.json`),
        "utf8",
      );
      const docs = JSON.parse(data) as Record<string, unknown>[];

      switch (collection) {
        case "users":
          await User.insertMany(docs);
          break;
        case "organizations":
          await Organization.insertMany(docs);
          break;
        case "actionItemCategories":
          await ActionItemCategory.insertMany(docs);
          break;
        case "agendaCategories":
          await AgendaCategoryModel.insertMany(docs);
          break;
        case "events":
          await Event.insertMany(docs);
          break;
        case "venue":
          await Venue.insertMany(docs);
          break;
        case "recurrenceRules":
          await RecurrenceRule.insertMany(docs);
          break;
        case "posts":
          await Post.insertMany(docs);
          break;
        case "appUserProfiles":
          await AppUserProfile.insertMany(docs);
          break;
        default:
          console.log("\x1b[31m", `Invalid collection name: ${collection}`);
          break;
      }

      console.log("\x1b[35m", `Added ${collection} collection`);
    }

    // Check document counts after import
    await checkCountAfterImport();

    console.log("\nCollections added successfully");
  } catch (err) {
    console.error("\x1b[31m", `Error adding collections: ${err}`);
  } finally {
    process.exit(0);
  }
}

/**
 * Checks document counts in specified collections after data insertion.
 */
async function checkCountAfterImport(): Promise<void> {
  try {
    // Connect to MongoDB database
    await connect("talawa-api");

    const collections = [
      { name: "users", model: User },
      { name: "organizations", model: Organization },
      { name: "actionItemCategories", model: ActionItemCategory },
      { name: "agendaCategories", model: AgendaCategoryModel },
      { name: "events", model: Event },
      { name: "recurrenceRules", model: RecurrenceRule },
      { name: "posts", model: Post },
      { name: "venue", model: Venue },
      { name: "appUserProfiles", model: AppUserProfile },
    ];

    console.log("\nDocument Counts After Import:\n");

    // Table header
    console.log(
      "| Collection Name".padEnd(30) +
        "| Document Count |\n" +
        "|".padEnd(30, "-") +
        "|----------------|\n",
    );

    // Display document counts for each collection
    for (const { name, model } of collections) {
      const count = await model.countDocuments();
      console.log(`| ${name.padEnd(28)}| ${count.toString().padEnd(15)}|`);
    }
  } catch (err) {
    console.error("\x1b[31m", `Error checking document count: ${err}`);
  }
}

// Default collections available to insert
const collections = [
  "users",
  "organizations",
  "posts",
  "events",
  "venue",
  "recurrenceRules",
  "appUserProfiles",
  "actionItemCategories",
  "agendaCategories",
];

// Check if specific collections need to be inserted
const { items: argvItems } = yargs(hideBin(process.argv))
  .options({
    items: {
      alias: "i",
      describe: "Comma-separated list of collections to load sample data into",
      type: "string",
    },
  })
  .parseSync() as InterfaceArgs;

(async (): Promise<void> => {
  if (argvItems) {
    const specificCollections = argvItems.split(",");
    await listSampleData();
    await insertCollections(specificCollections);
  } else {
    await listSampleData();
    await insertCollections(collections);
  }
})();
