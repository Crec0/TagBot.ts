import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db, tagsTable } from '../database.js';
import { and, eq, sql } from 'drizzle-orm';


export async function handleListTag(interaction: ChatInputCommandInteraction) {
    const tags = db
        .select()
        .from(tagsTable)
        .where(
            and(
                eq(tagsTable.guildID, sql.placeholder('guild_id')),
            ),
        )
        .prepare(false)
        .all({ guild_id: interaction.guild!.id });

    const descriptionLines: string[] = [];

    let count = 0;

    for ( const tag of tags ) {
        descriptionLines.push(
            `${ count }. **${ tag.tagName }**, id: ${ tag.tagID }, *by ${ tag.authorUsername }*`,
        );
    }

    const embed = new EmbedBuilder()
        .setColor('#ffcccc')
        .setTitle('Tags');

    if ( descriptionLines.length > 0 ) {
        embed.setDescription(descriptionLines.join('\n'));
    } else {
        embed.setDescription(':cricket: No tags :cricket:');
    }

    await interaction.reply({
        embeds: [ embed ],
    });
}