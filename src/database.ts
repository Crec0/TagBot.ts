import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

const users = sqliteTable("users", {
    id: integer("id").primaryKey(),
    tagName: text("tag_name"),
    content: text("content"),
    createdBy: text("created_by"),
    timeCreated: datetime("time_created"),
});

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

const allUsers = db.select().from(users).all();
