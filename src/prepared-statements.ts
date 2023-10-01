import {asc, eq, sql} from 'drizzle-orm';
import {attachmentTable, db, tagsTable} from './database.js';

export const getTagPreparedStatement = db
    .select()
    .from(tagsTable)
    .where(eq(tagsTable.tagName, sql.placeholder('query')))
    .orderBy(asc(tagsTable.tagName))
    .limit(1)
    .prepare(false);

export const listTagsPreparedStatement = db
    .select({name: tagsTable.tagName})
    .from(tagsTable)
    .where(eq(tagsTable.guildID, sql.placeholder('guildId')))
    .prepare(false);

export const getAttachmentsPreparedStatement = db
    .select({url: attachmentTable.url})
    .from(attachmentTable)
    .where(eq(attachmentTable.tagID, sql.placeholder('tagId')))
    .prepare(false);
