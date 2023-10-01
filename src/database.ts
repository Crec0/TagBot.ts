import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
import {BetterSQLite3Database, drizzle} from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

export const db: BetterSQLite3Database = drizzle(new Database('./tags.db'), {logger: true});

db.run(sql`
    CREATE TABLE IF NOT EXISTS tags
    (
        tag_id           INTEGER PRIMARY KEY AUTOINCREMENT,
        time_created     INTEGER NOT NULL DEFAULT (UNIXEPOCH()),
        tag_name         TEXT    NOT NULL,
        content          TEXT    NOT NULL,
        author_username  TEXT    NOT NULL,
        author_user_id   TEXT    NOT NULL,
        creator_username TEXT    NOT NULL,
        creator_user_id  TEXT    NOT NULL,
        guild_id         TEXT    NOT NULL
    );
`);

export const tagsTable = sqliteTable('tags', {
    tagID: integer('tag_id').primaryKey().notNull(),
    timeCreated: integer('time_created', {mode: 'timestamp'}).notNull().default(sql`(UNIXEPOCH())`),
    tagName: text('tag_name').notNull(),
    content: text('content').notNull(),
    authorUsername: text('author_username').notNull(),
    authorUserID: text('author_user_id').notNull(),
    guildID: text('guild_id').notNull()
});

export type TagsInsertType = typeof tagsTable.$inferInsert
export type TagsSelectType = typeof tagsTable.$inferSelect

db.run(sql`
    CREATE TABLE IF NOT EXISTS attachments
    (
        tag_id INTEGER NOT NULL,
        name   TEXT    NOT NULL,
        url    TEXT    NOT NULL,
        FOREIGN KEY (tag_id) REFERENCES tags (tag_id)
    );
`);

export const attachmentTable = sqliteTable('attachments', {
    tagID: integer('tag_id').notNull().references(() => tagsTable.tagID),
    name: text('name').notNull(),
    url: text('url').notNull(),
});

export type AttachmentInsertType = typeof attachmentTable.$inferInsert
export type AttachmentSelectType = typeof attachmentTable.$inferSelect
