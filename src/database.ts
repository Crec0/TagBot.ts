import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';


export const db: BetterSQLite3Database = drizzle( new Database( './tags.db' ), { logger: true } );

db.run( sql`
    CREATE TABLE IF NOT EXISTS tags
    (
        tag_id          INTEGER PRIMARY KEY AUTOINCREMENT,
        time_created    INTEGER NOT NULL DEFAULT (UNIXEPOCH()),
        tag_name        TEXT    NOT NULL,
        content         TEXT    NOT NULL,
        guild_id        TEXT    NOT NULL,
        owner_username TEXT,
        owner_user_id  TEXT
    );
` );

export const tagsTable = sqliteTable( 'tags', {
    tagID: integer( 'tag_id' ).primaryKey().notNull(),
    timeCreated: integer( 'time_created', { mode: 'timestamp' } ).notNull().default( sql`(UNIXEPOCH())` ),
    tagName: text( 'tag_name' ).notNull(),
    content: text( 'content' ).notNull(),
    guildID: text( 'guild_id' ).notNull(),
    ownerUsername: text( 'owner_username' ),
    ownerUserID: text( 'owner_user_id' ),
} );

db.run( sql`
    CREATE TABLE IF NOT EXISTS attachments
    (
        tag_id INTEGER NOT NULL,
        name   TEXT    NOT NULL,
        url    TEXT    NOT NULL,
        type   TEXT,
        FOREIGN KEY (tag_id) REFERENCES tags (tag_id)
    );
` );

export const attachmentTable = sqliteTable( 'attachments', {
    tagID: integer( 'tag_id' ).notNull().references( () => tagsTable.tagID ),
    name: text( 'name' ).notNull(),
    url: text( 'url' ).notNull(),
    type: text( 'type' ),
} );
