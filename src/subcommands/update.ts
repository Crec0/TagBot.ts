import { Attachment, ChatInputCommandInteraction, Message, PermissionsBitField } from 'discord.js';
import { getTagPreparedStatement } from '../prepared-statements.js';
import { attachmentTable, db, tagsTable } from '../database.js';
import { eq } from 'drizzle-orm';


export async function handleUpdateTag(interaction: ChatInputCommandInteraction, tagID: string, message: Message, shouldUseEmbed: boolean) {
    const tag = getTagPreparedStatement.get({ tag_id: tagID });

    if ( tag == null ) {
        await interaction.editReply({
            content: 'Tag name provided is invalid. Please check and try again.',
        });
        return;
    }

    if ( interaction.user.id !== tag.ownerUserID && !interaction.memberPermissions!.has(PermissionsBitField.Flags.Administrator) ) {
        await interaction.editReply({
            content: 'You are not the owner of the tag.',
        });
        return;
    }

    db.update(tagsTable)
        .set({
            content: message.content,
            ownerUsername: interaction.user.username,
            ownerUserID: interaction.user.id,
            useEmbed: shouldUseEmbed ? 1 : 0,
        })
        .where(eq(tagsTable.tagID, tag.tagID))
        .prepare(true)
        .run();

    db.delete(attachmentTable)
        .where(eq(attachmentTable.tagID, tag.tagID))
        .prepare(true)
        .run();

    if ( message.attachments.size > 0 ) {
        const attachmentsRows = message.attachments
            .map((attachment: Attachment): typeof attachmentTable.$inferInsert => {
                return {
                    tagID: tag.tagID,
                    name: attachment.name,
                    url: attachment.url,
                    type: attachment.contentType,
                };
            });

        db.insert(attachmentTable)
            .values(attachmentsRows)
            .prepare(true)
            .run();
    }

    await interaction.editReply(`Successfully updated tag: '${ tag.tagName }'`);
}