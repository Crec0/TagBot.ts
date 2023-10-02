import { eq, sql } from 'drizzle-orm';
import { attachmentTable, db, tagsTable } from './database.js';


export const getTagPreparedStatement = db
    .select()
    .from(tagsTable)
    .where(eq(tagsTable.tagID, sql.placeholder('tag_id')))
    .limit(1)
    .prepare(false);

export const listTagsPreparedStatement = db
    .select()
    .from(tagsTable)
    .where( eq( tagsTable.guildID, sql.placeholder( 'guild_id' ) ) ) // Removed for now. Can be enabled later.
    .prepare(false);

export const getAttachmentsPreparedStatement = db
    .select()
    .from(attachmentTable)
    .where(eq(attachmentTable.tagID, sql.placeholder('tag_id')))
    .prepare(false);
