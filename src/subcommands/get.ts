import { ChatInputCommandInteraction, EmbedBuilder, userMention } from 'discord.js';
import { getAttachmentsPreparedStatement, getTagPreparedStatement } from '../prepared-statements.js';


export async function handleGetTag(interaction: ChatInputCommandInteraction, name: string) {
    const targetUserId = interaction.options.getUser('target')?.id;
    const isEphemeral = interaction.options.getBoolean('ephemeral') ?? false;
    const tag = getTagPreparedStatement.get({ tag_id: name });

    if ( tag == null ) {
        await interaction.reply({
            ephemeral: true,
            content: 'Tag name provided is invalid. Please check and try again.',
        });
        return;
    }

    const attachments = getAttachmentsPreparedStatement.all({ tag_id: tag.tagID });
    const mainEmbed = new EmbedBuilder()
        .setTitle(tag.tagName)
        .setDescription(tag.content == '' ? null : tag.content)
        .setFooter({
            text: `Owned by ${ tag.ownerUsername }`,
        })
        .setColor('#e77f67');

    const embeds = [ mainEmbed ];

    if ( attachments.length > 0 ) {
        const attachmentsEmbedDescription: string[] = [];
        let imageSetFlag = false;

        for ( const attachment of attachments ) {
            if ( !imageSetFlag && attachment.type?.includes('image') ) {
                mainEmbed.setImage(attachment.url);
                imageSetFlag = true;
            } else {
                attachmentsEmbedDescription.push(`[${ attachment.name }](${ attachment.url })`);
            }
        }
        if ( attachmentsEmbedDescription.length > 0 ) {
            const attachmentEmbed = new EmbedBuilder()
                .setDescription(attachmentsEmbedDescription.join('\n'))
                .setColor('#82ccdd');

            embeds.push(attachmentEmbed);
        }
    }

    await interaction.reply({
        embeds: embeds,
        ephemeral: isEphemeral,
        content: targetUserId != null ? userMention(targetUserId) : '',
        allowedMentions: targetUserId != null  ? { users: [ targetUserId ] } : {},
    });
}