import {asc, eq, like, sql} from 'drizzle-orm';
import {db, tagsTable} from './database.js';

export const getTagPreparedStatement = db
    .select()
    .from(tagsTable)
    .where(eq(tagsTable.tagID, sql.placeholder('query')))
    .orderBy(asc(tagsTable.tagName))
    .limit(1)
    .prepare(false);

export const listTagsPreparedStatement = db
    .select()
    .from(tagsTable)
    .where(like(tagsTable.creatorUsername, sql.placeholder('query')))
    .orderBy(asc(tagsTable.tagName))
    .limit(25)
    .prepare(false);
