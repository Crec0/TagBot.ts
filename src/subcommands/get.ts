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
import { logger } from '../index.js';
import type { Attachment, Tag } from '../database.js';


function createEmbeds(tag: Tag, embeds: EmbedBuilder[], attachments: Attachment[]) {
    const mainEmbed = new EmbedBuilder()
        .setTitle(tag.tagName)
        .setDescription(tag.content == '' ? null : tag.content)
        .setFooter({
            text: `Owned by ${ tag.ownerUsername }`,
        })
        .setColor('#e77f67');

    embeds.push(mainEmbed);

    if ( attachments.length == 0 ) {
        return;
    }

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

function createButton(interaction: ChatInputCommandInteraction, isEphemeral: boolean) {
    const button = isEphemeral
        ? new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setLabel('Post')
            .setEmoji('\uD83D\uDCE4')
            .setCustomId(parseInt(interaction.id).toString(36).slice(8))
        : new ButtonBuilder()
            .setStyle(ButtonStyle.Danger)
            .setLabel('Quick delete')
            .setEmoji('\uD83D\uDDD1')
            .setCustomId(parseInt(interaction.id).toString(36).slice(8));

    return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
}

export async function handleGetTag(cmdIntr: ChatInputCommandInteraction, name: string, isEphemeral: boolean) {
    const targetUserId = cmdIntr.options.getUser('target')?.id;
    const tag = getTagPreparedStatement.get({ tag_id: name });

    if ( tag == null ) {
        await cmdIntr.reply({
            ephemeral: true,
            content: 'Tag name provided is invalid. Please check and try again.',
        });
        return;
    }
    const useEmbed = cmdIntr.options.getBoolean('use-embed') ?? tag.useEmbed === 1;

    const embeds: EmbedBuilder[] = [];
    let content = ( targetUserId != null ? `${ userMention(targetUserId) }\n` : '' );

    const attachments = getAttachmentsPreparedStatement.all({ tag_id: tag.tagID });

    if ( !useEmbed ) {
        content += tag.content + '\n';
        if ( attachments.length > 0 ) {
            content += attachments
                .map(attachment => `[${ attachment.name }](${ attachment.url })`)
                .join('\n');
        }
    } else {
        createEmbeds(tag, embeds, attachments);
    }

    const actionRow = createButton(cmdIntr, isEphemeral);

    const repliedMessage = await cmdIntr.reply({
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
            filter: (btn: ButtonInteraction) => {
                return btn.user.id === cmdIntr.user.id;
            },
        })
        .then(async (btnIntr: ButtonInteraction) => {
            if ( isEphemeral ) {
                await cmdIntr.channel!.send({
                    content: content,
                    embeds: embeds,
                    allowedMentions: targetUserId != null ? { users: [ targetUserId ] } : {},
                });
                await btnIntr.update({ content: 'Sent!', embeds: [], components: [] });
                await cmdIntr.deleteReply();
            } else {
                await repliedMessage.delete();
            }
        })
        .catch(async (i) => logger.warn(i.message));
}