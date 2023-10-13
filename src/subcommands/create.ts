import { Attachment, ChatInputCommandInteraction, Message, ModalSubmitInteraction } from 'discord.js';
import { attachmentTable, db, tagsTable } from '../database.js';


export async function handleCreateTag(
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
    tagName: string,
    targetMessage: Message,
    useEmbed: boolean,
) {
    const insertRes = db.insert(tagsTable)
        .values({
            content: targetMessage.content,
            tagName: tagName,
            ownerUsername: interaction.user.username,
            ownerUserID: interaction.user.id.toString(),
            guildID: interaction.guild!.id,
            useEmbed: useEmbed ? 1 : 0,
        })
        .returning()
        .prepare(true)
        .all();

    if ( insertRes.length === 0 ) {
        await interaction.editReply(`Tag name: '${ tagName }' is already in use. Please choose a different name and try again.`);
        return;
    }

    const attachments = targetMessage.attachments;

    if ( attachments.size > 0 ) {
        const attachmentsRows = attachments.map((attachment: Attachment): typeof attachmentTable.$inferInsert => {
            return {
                tagID: insertRes[0]!.tagID,
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

    await interaction.editReply(`Successfully created tag: '${ tagName }'`);
}
