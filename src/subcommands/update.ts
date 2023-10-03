import { ChatInputCommandInteraction } from 'discord.js';
import { db, tagsTable } from '../database.js';
import { eq, sql } from 'drizzle-orm';


export async function handleUpdateTag(interaction: ChatInputCommandInteraction, tagName: string, messageId: string) {
    await interaction.deferReply();

    const tag = db
        .select()
        .from(tagsTable)
        .where(eq(tagsTable.tagName, sql.placeholder('tag_id')))
        .limit(1)
        .prepare(false);

    const message = await interaction.channel?.messages.fetch(messageId).catch(err => {
        console.log(interaction.user.username, 'caused', err.message);
    });
    if ( message == null ) {
        await interaction.editReply('Message ID provided is invalid. Please check and try again.');
        return;
    }

    await interaction.editReply(`Successfully created tag: '${ tagName }'`);
}