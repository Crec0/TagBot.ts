import { Attachment, ChatInputCommandInteraction, Message, ModalSubmitInteraction } from 'discord.js';
import { attachmentTable, db, tagsTable } from '../database.js';


export async function insertTag(
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
    tagName: string,
    targetMessage: Message,
) {
    const insertRes = db.insert(tagsTable)
        .values({
            content: targetMessage.content,
            tagName: tagName,
            ownerUsername: interaction.user.username,
            ownerUserID: interaction.user.id.toString(),
            guildID: interaction.guild!.id,
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
                tagID: insertRes[0].tagID,
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


export async function handleCreateTag(interaction: ChatInputCommandInteraction, name: string, messageId: string) {
    await interaction.deferReply();
    const message = await interaction.channel?.messages.fetch(messageId).catch(err => {
        console.log(interaction.user.username, 'caused', err.message);
    });
    if ( message == null ) {
        await interaction.editReply('Message ID provided is invalid. Please check and try again.');
        return;
    }
    await insertTag(interaction, name, message);
}