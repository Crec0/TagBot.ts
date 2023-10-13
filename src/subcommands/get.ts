import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    Message,
    userMention,
} from 'discord.js';
import { getAttachmentsPreparedStatement, getTagPreparedStatement } from '../prepared-statements.js';


export async function handleGetTag(interaction: ChatInputCommandInteraction, name: string) {
    const targetUserId = interaction.options.getUser('target')?.id;
    const isEphemeral = interaction.options.getBoolean('ephemeral') ?? false;
    const useEmbed = interaction.options.getBoolean('use-embed') ?? true;
    const tag = getTagPreparedStatement.get({ tag_id: name });

    if ( tag == null ) {
        await interaction.reply({
            ephemeral: true,
            content: 'Tag name provided is invalid. Please check and try again.',
        });
        return;
    }

    let repliedMessage: Message<boolean>;

    const quickYeetButtonID = Number(interaction.id).toString(36).slice(-8);
    const quickYeetButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setLabel('Delete')
        .setEmoji('\uD83D\uDDD1')
        .setCustomId(quickYeetButtonID);
    const buttonCollectorFilter = (btnIntr: ButtonInteraction) => {
        btnIntr.deferUpdate();
        return btnIntr.user.id === interaction.user.id;
    };
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(quickYeetButton);

    const attachments = getAttachmentsPreparedStatement.all({ tag_id: tag.tagID });

    if ( tag.useEmbed === 0 || !useEmbed ) {
        let content = ( targetUserId != null ? `${ userMention(targetUserId) }\n` : '' ) + tag.content;

        if ( attachments.length > 0 ) {
            const attachmentLinks: string[] = [];

            for ( const attachment of attachments ) {
                attachmentLinks.push(`[${ attachment.name }](${ attachment.url })`);
            }
            if ( attachmentLinks.length > 0 ) {
                content += '\n' + attachmentLinks.join('\n');
            }
        }
        repliedMessage = await interaction.reply({
            fetchReply: true,
            ephemeral: isEphemeral,
            content: content,
            components: [ actionRow ],
            allowedMentions: targetUserId != null ? { users: [ targetUserId ] } : {},
        });

    } else {
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
        repliedMessage = await interaction.reply({
            embeds: embeds,
            ephemeral: isEphemeral,
            fetchReply: true,
            components: [ actionRow ],
            content: targetUserId != null ? userMention(targetUserId) : '',
            allowedMentions: targetUserId != null ? { users: [ targetUserId ] } : {},
        });
    }

    repliedMessage.awaitMessageComponent({
            time: 30_000,
            componentType: ComponentType.Button,
            filter: buttonCollectorFilter,
        })
        .then(async (i) => {
            await repliedMessage.delete();
        })
        .catch(async (i) => {
            console.error(i)
            await repliedMessage.edit({ components: [] });
        });
}