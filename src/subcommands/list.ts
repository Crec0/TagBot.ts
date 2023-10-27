import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { db, tagsTable } from '../database.js';
import { and, eq, isNull, sql } from 'drizzle-orm';


export async function handleListTag(interaction: ChatInputCommandInteraction) {
    const conditions = [
        eq(tagsTable.guildID, sql.placeholder('guild_id')),
    ];

    const username = interaction.options.getUser('user')?.username;
    const isUnclaimed = interaction.options.getBoolean('is-unclaimed') ?? false;

    if ( username != null ) {
        conditions.push(eq(tagsTable.ownerUsername, sql.placeholder('username')));
    } else if ( isUnclaimed ) {
        conditions.push(isNull(tagsTable.ownerUsername));
    }

    const tags = db
        .select()
        .from(tagsTable)
        .where(and(...conditions))
        .prepare(false)
        .all({
            guild_id: interaction.guild!.id,
            username: username,
        });

    const descriptionLines: string[] = [];

    for ( const tag of tags ) {
        const ownershipStatus = tag.ownerUserID == null ? 'Unclaimed' : `owned by ${ tag.ownerUsername }`;
        descriptionLines.push(`0. **${ tag.tagName }**, id: ${ tag.tagID }, ${ ownershipStatus }`);
    }

    const titlePrefix = username == null && isUnclaimed ? 'Unclaimed' : 'All';
    const titleSuffix = username != null ? ` owned by ${ username }` : '';

    const embed = new EmbedBuilder()
        .setColor('#ffcccc')
        .setTitle(`${ titlePrefix } tags${ titleSuffix }`);

    if ( descriptionLines.length > 0 ) {
        embed.setDescription(descriptionLines.join('\n'));
    } else {
        embed.setDescription(':cricket: No tags :cricket:');
    }

    await interaction.reply({
        embeds: [ embed ],
    });
}