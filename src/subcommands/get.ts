import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    userMention,
} from 'discord.js';
import { getAttachmentsPreparedStatement, getTagPreparedStatement } from '../prepared-statements.js';


export async function handleGetTag(interaction: ChatInputCommandInteraction, name: string, isEphemeral: boolean) {
    const targetUserId = interaction.options.getUser('target')?.id;
    const useEmbed = interaction.options.getBoolean('use-embed') ?? true;
    const tag = getTagPreparedStatement.get({ tag_id: name });

    if ( tag == null ) {
        await interaction.reply({
            ephemeral: true,
            content: 'Tag name provided is invalid. Please check and try again.',
        });
        return;
    }
    const embeds = [];
    let content = ( targetUserId != null ? `${ userMention(targetUserId) }\n` : '' );

    const attachments = getAttachmentsPreparedStatement.all({ tag_id: tag.tagID });

    if ( tag.useEmbed === 0 || !useEmbed ) {
        content += tag.content;
        if ( attachments.length > 0 ) {
            const attachmentLinks = attachments.map(attachment => `[${ attachment.name }](${ attachment.url })`);
            if ( attachmentLinks.length > 0 ) {
                content += '\n' + attachmentLinks.join('\n');
            }
        }
    } else {
        const mainEmbed = new EmbedBuilder()
            .setTitle(tag.tagName)
            .setDescription(tag.content == '' ? null : tag.content)
            .setFooter({
                text: `Owned by ${ tag.ownerUsername }`,
            })
            .setColor('#e77f67');

        embeds.push(mainEmbed);

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
    }
    const quickYeetButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setLabel('Quick delete')
        .setEmoji('\uD83D\uDDD1')
        .setCustomId(parseInt(interaction.id).toString(36).slice(8));

    const quickYeetUserFilter = (btnIntr: ButtonInteraction) => {
        btnIntr.deferUpdate();
        return btnIntr.user.id === interaction.user.id;
    };

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(quickYeetButton);
    const repliedMessage = await interaction.reply({
        allowedMentions: targetUserId != null ? { users: [ targetUserId ] } : {},
        components: [ actionRow ],
        content: content,
        embeds: embeds,
        ephemeral: isEphemeral,
        fetchReply: true,
    });

    repliedMessage.awaitMessageComponent({
            time: 30_000,
            componentType: ComponentType.Button,
            filter: quickYeetUserFilter,
        })
        .then(async (i) => await repliedMessage.delete())
        .catch(async (i) => {
            console.error(i);
            await repliedMessage.edit({ components: [] });
        });
}