import {
    ActionRowBuilder,
    ApplicationCommandType,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder,
    MessageContextMenuCommandInteraction,
    ModalBuilder,
    ModalSubmitInteraction,
    SlashCommandBooleanOption,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    SlashCommandUserOption,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import { listTagsPreparedStatement } from './prepared-statements.js';
import { distance } from 'fastest-levenshtein';
import { handleGetTag } from './subcommands/get.js';
import { handleDeleteTag } from './subcommands/delete.js';
import { handleListTag } from './subcommands/list.js';
import { handleUpdateTag } from './subcommands/update.js';
import { handleCreateTag, insertTag } from './subcommands/insert.js';


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
                .addUserOption(
                    new SlashCommandUserOption()
                        .setName('target')
                        .setDescription('User to ping on response. ephemeral option is ignored, if provided'),
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
                .setDescription('List all available tags')
                .addUserOption(
                    new SlashCommandUserOption()
                        .setName('user')
                        .setDescription('Only display tags owned by this user'),
                )
                .addBooleanOption(
                    new SlashCommandBooleanOption()
                        .setName('is-unclaimed')
                        .setDescription('Only display tags unclaimed tags'),
                ),
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
                .setDescription('Delete the tag. Can only delete tags created by yourself.')
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
            return { name: `${ scoredNames.name } ID: ${ scoredNames.id }`, value: `${ scoredNames.id }` };
        });

    await interaction.respond(tagNames);
}

async function fetchMessageOrThrow(interaction: ChatInputCommandInteraction): Promise<Message> {
    const messageId = interaction.options.getString('message-id')!.trim();

    let message = null;
    try {
        message = await interaction.channel?.messages.fetch(messageId);
    } catch ( e ) {
        console.error(e)
    }

    if ( message == null ) {
        throw Error('Message ID provided is invalid. Please check and try again.');
    }

    return message;
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
        await interaction.deferReply({ ephemeral: true });
        const insertMessage = await fetchMessageOrThrow(interaction);
        await handleCreateTag(interaction, name!, insertMessage!);
        break;

    case 'update':
        await interaction.deferReply({ ephemeral: true });
        const updateMessage = await fetchMessageOrThrow(interaction);
        await handleUpdateTag(interaction, name!, updateMessage!);
        break;

    case 'delete':
        await handleDeleteTag(interaction, name!);
        break;

    case 'list':
        await handleListTag(interaction);
        break;
    }
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
