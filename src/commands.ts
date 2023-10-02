import {
    ActionRowBuilder,
    ApplicationCommandType,
    Attachment,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder,
    EmbedBuilder,
    Message,
    MessageContextMenuCommandInteraction,
    ModalBuilder,
    ModalSubmitInteraction,
    PermissionsBitField, SlashCommandBooleanOption,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import { AttachmentInsertType, attachmentTable, db, tagsTable } from './database.js';
import {
    getAttachmentsPreparedStatement,
    getTagPreparedStatement,
    listTagsPreparedStatement,
} from './prepared-statements.js';
import { distance } from 'fastest-levenshtein';
import { eq } from 'drizzle-orm';


export const commands = [
    new SlashCommandBuilder()
        .setName('tag')
        .setDescription('View, List, Create, Manage tags!')
        .setDMPermission(false)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName('get')
                .setDescription('Retrieves a tag and sends it')
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName('name')
                        .setDescription('Name of the tag')
                        .setRequired(true)
                        .setAutocomplete(true),
                )
                .addBooleanOption(
                    new SlashCommandBooleanOption()
                        .setName('ephemeral')
                        .setDescription('Should the reply be ephemeral'),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName('create')
                .setDescription('Create a tag')
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName('name')
                        .setDescription('Name of the tag')
                        .setRequired(true),
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName('message-id')
                        .setDescription('Message id of the message you want to create a tag for')
                        .setRequired(true),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName('list')
                .setDescription('List all available tags'),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName('update')
                .setDescription('Update the tag. Can only update tags created by you.')
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName('name')
                        .setDescription('Name of the tag')
                        .setRequired(true)
                        .setAutocomplete(true),
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName('message-id')
                        .setDescription('Message id of the message you want to update the tag with.')
                        .setRequired(true),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName('delete')
                .setDescription('Delete the tag. Can only delete tags created by you.')
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName('name')
                        .setDescription('Name of the tag')
                        .setRequired(true)
                        .setAutocomplete(true),
                ),
        ),
    new ContextMenuCommandBuilder()
        .setName('Create tag')
        .setType(ApplicationCommandType.Message)
        .setDMPermission(false),
];

export async function handleAutocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const tagNames = listTagsPreparedStatement
        .all({ guild_id: interaction.guild!.id })
        .flatMap(tag => {
            return { name: tag.tagName, score: distance(focusedValue, tag.tagName), id: tag.tagID };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 25)
        .map(scoredNames => {
            return { name: scoredNames.name, value: `${ scoredNames.id }` };
        });

    await interaction.respond(tagNames);
}

export async function handleMessageContextMenuCommand(intr: MessageContextMenuCommandInteraction) {
    const modalID = 'tag-name-modal-' + Number(intr.id).toString(36).slice(-8);

    const inputComponent = new TextInputBuilder()
        .setCustomId('tag-name-modal-input')
        .setLabel('Tag Name')
        .setStyle(TextInputStyle.Short)
        .setMinLength(3);

    const inputActionRow = new ActionRowBuilder<TextInputBuilder>()
        .addComponents(inputComponent);

    const modal = new ModalBuilder()
        .setCustomId(modalID)
        .setTitle('Create tag')
        .addComponents(inputActionRow);

    const modalFilter = async (mi: ModalSubmitInteraction) => {
        await mi.deferReply({ ephemeral: true });
        return mi.customId === modalID;
    };

    await intr.showModal(modal);

    intr.awaitModalSubmit({ time: 10_000, filter: modalFilter })
        .then(async (modalIntr) => {
            const tagName = modalIntr.components[0].components[0].value;
            await insertTag(modalIntr, tagName, intr.targetMessage);
        })
        .catch(console.error);
}

async function insertTag(
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
    tagName: string,
    targetMessage: Message,
) {
    const insertRes = db.insert(tagsTable)
        .values({
            content: targetMessage.content,
            tagName: tagName,
            originalUsername: targetMessage.author.username,
            originalUserID: targetMessage.author.id.toString(),
            authorUsername: interaction.user.username,
            authorUserID: interaction.user.id.toString(),
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
        const attachmentsRows = attachments.map((attachment: Attachment): AttachmentInsertType => {
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

async function handleGetTag(interaction: ChatInputCommandInteraction, name: string) {
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
        .setDescription(tag.content)
        .setFooter({
            text: `Tag by ${ tag.authorUsername } | Original message by ${ tag.originalUsername }`,
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

    await interaction.reply({ embeds: embeds, ephemeral: isEphemeral });
}

async function handleCreateTag(interaction: ChatInputCommandInteraction, name: string, messageId: string) {
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

async function handleDeleteTag(interaction: ChatInputCommandInteraction, name: string) {
    const tag = getTagPreparedStatement.get({ tag_id: name });

    if ( tag == null ) {
        await interaction.reply({
            ephemeral: true,
            content: 'Tag name provided is invalid. Please check and try again.',
        });
        return;
    }

    if ( interaction.user.id !== tag.authorUserID || !interaction.memberPermissions!.has(PermissionsBitField.Flags.Administrator) ) {
        await interaction.reply({
            ephemeral: true,
            content: 'You are not the author of the tag.',
        });
        return;
    }

    db.delete(attachmentTable)
        .where(eq(attachmentTable.tagID, tag.tagID))
        .prepare(true)
        .run();

    db.delete(tagsTable)
        .where(eq(tagsTable.tagID, tag.tagID))
        .prepare(true)
        .run();

    await interaction.reply({
        ephemeral: true,
        content: `Tag ${ tag.tagName } successfully deleted.`,
    });
}


async function handleListTag(interaction: ChatInputCommandInteraction) {
    const tags = listTagsPreparedStatement.all({ guild_id: interaction.guild!.id });

    const descriptionLines: string[] = [];
    for ( const tag of tags ) {
        descriptionLines.push(
            `- ${ tag.tagName }, created by ${ tag.authorUsername }`,
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

export async function handleChatCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const name = interaction.options.getString('name')?.trim();
    const messageId = interaction.options.getString('message-id')?.trim();

    switch ( subcommand ) {
    case 'get':
        await handleGetTag(interaction, name!);
        break;

    case 'create':
        await handleCreateTag(interaction, name!, messageId!);
        break;

    case 'update':
        break;

    case 'delete':
        await handleDeleteTag(interaction, name!);
        break;

    case 'list':
        await handleListTag(interaction);
        break;
    }
}
