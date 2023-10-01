import {
    ActionRowBuilder,
    ApplicationCommandType,
    Attachment,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder, EmbedBuilder,
    Message,
    MessageContextMenuCommandInteraction,
    ModalBuilder,
    ModalSubmitInteraction,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import {AttachmentInsertType, attachmentTable, db, tagsTable} from './database.js';
import {getTagPreparedStatement, listTagsPreparedStatement} from './prepared-statements.js';
import {distance} from 'fastest-levenshtein';

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
        .all()
        .flatMap(row => row.name)
        .map(name => {
            return {name: name, score: distance(focusedValue, name)};
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 25)
        .map(scoredNames => {
            return {name: scoredNames.name, value: scoredNames.name};
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
        await mi.deferReply({ephemeral: true});
        return mi.customId === modalID;
    };

    await intr.showModal(modal);

    const modalIntr = await intr.awaitModalSubmit({time: 10_000, filter: modalFilter});
    const tagName = modalIntr.components[0].components[0].value;

    await insertTag(modalIntr, tagName, intr.targetMessage);
}

async function insertTag(
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
    tagName: string,
    targetMessage: Message,
) {
    await db.transaction(async (tx) => {
        const insertRes = tx.insert(tagsTable)
            .values({
                content: targetMessage.content,
                tagName: tagName,
                creatorUsername: interaction.user.username,
                creatorUserID: interaction.user.id.toString(),
                authorUsername: targetMessage.author.username,
                authorUserID: targetMessage.author.id.toString(),
            })
            .returning()
            .onConflictDoNothing({target: tagsTable.tagName})
            .prepare(true)
            .all();

        console.log(insertRes);

        if (insertRes.length === 0) {
            await interaction.editReply(`Tag name: '${tagName}' is already in use. Please choose a different name and try again.`);
            return;
        }

        const attachments = targetMessage.attachments;

        if (attachments.size > 0) {
            const attachmentsRows = attachments.map((attachment: Attachment): AttachmentInsertType => {
                return {tagID: insertRes[0].tagID, url: attachment.url};
            });

            const attachMentsRes = tx.insert(attachmentTable)
                .values(attachmentsRows)
                .prepare(true)
                .all();

            console.log(attachMentsRes);
        }

        await interaction.editReply(`Successfully created tag: '${tagName}'`);
    });

}

export async function handleChatCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const name = interaction.options.getString('name')?.trim();
    const messageId = interaction.options.getString('message-id')?.trim();

    if (name == null) {
        await interaction.reply({
            ephemeral: true,
            content: 'Message ID provided is invalid. Please check and try again.',
        });
        return;
    }

    switch (subcommand) {
        case 'get':
            const tag = getTagPreparedStatement.get({query: name});

            if (tag == null) {
                await interaction.reply({
                    ephemeral: true,
                    content: 'Tag name provided is invalid. Please check and try again.',
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(tag.tagName)
                .setDescription(tag.content)
                .setFooter({
                    text: `Tag created by ${tag.creatorUsername}`,
                })
                .setColor('Greyple');

            await interaction.reply({
                embeds: [embed],
            });

            break;
        case 'create':
            await interaction.deferReply();

            const message = await interaction.channel?.messages.fetch(messageId!).catch(err => {
                console.log(interaction.user.username, 'caused', err.message);
            });

            if (message == null) {
                await interaction.editReply('Message ID provided is invalid. Please check and try again.');
                return;
            }
            await insertTag(interaction, name, message);
            break;
        case 'update':
            break;
        case 'delete':
            break;
        case 'list':
            break;
    }
}
