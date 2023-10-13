import {
    ActionRowBuilder,
    ApplicationCommandType,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder,
    Message,
    MessageContextMenuCommandInteraction,
    ModalBuilder,
    ModalSubmitInteraction,
    SlashCommandBooleanOption,
    SlashCommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandBuilder,
    type SlashCommandSubcommandsOnlyBuilder,
    SlashCommandUserOption,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import { listTagsPreparedStatement } from './prepared-statements.js';
import { handleGetTag } from './subcommands/get.js';
import { handleDeleteTag } from './subcommands/delete.js';
import { handleListTag } from './subcommands/list.js';
import { handleUpdateTag } from './subcommands/update.js';
import { handleCreateTag } from './subcommands/create.js';
import { bitapSearch } from './bitap.js';

// import { handleClaimTag, handleReleaseTag, handleTransferTag } from './subcommands/ownership.js';


export const commands: ( SlashCommandSubcommandsOnlyBuilder | ContextMenuCommandBuilder )[] = [
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
                )
                .addBooleanOption(
                    new SlashCommandBooleanOption()
                        .setName('use-embed')
                        .setDescription('Should the message be sent as an embed. Defaults to true.'),
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
                        .setMinLength(3)
                        .setMaxLength(32)
                        .setRequired(true),
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName('message-id')
                        .setDescription('Message id of the message you want to create a tag for')
                        .setRequired(true),
                )
                .addBooleanOption(
                    new SlashCommandBooleanOption()
                        .setName('use-embed')
                        .setDescription('Should the message be sent as an embed. Defaults to true.'),
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
                        .setMinLength(3)
                        .setMaxLength(32)
                        .setRequired(true),
                )
                .addBooleanOption(
                    new SlashCommandBooleanOption()
                        .setName('use-embed')
                        .setDescription('Should the message not create an embed'),
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
        .map(tag => {
            return { name: tag.tagName, score: bitapSearch(tag.tagName, focusedValue), id: tag.tagID };
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
        message = await interaction.channel?.messages.fetch({
            message: messageId,
            force: true,
        });
    } catch ( e ) {
        console.error(e);
    }

    if ( message == null ) {
        throw Error('Message ID provided is invalid. Please check and try again.');
    }

    return message;
}

export async function handleChatCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const name = interaction.options.getString('name')?.trim();

    switch ( subcommand ) {
    case 'get':
        await handleGetTag(interaction, name!);
        break;

    case 'create':
        await interaction.deferReply({ ephemeral: true });
        const insertMessage = await fetchMessageOrThrow(interaction);
        const useEmbed = interaction.options.getBoolean('use-embed') ?? false;
        await handleCreateTag(interaction, name!, insertMessage!, useEmbed);
        break;

    case 'update':
        await interaction.deferReply({ ephemeral: true });
        const updateMessage = await fetchMessageOrThrow(interaction);
        const shouldUseEmbed = interaction.options.getBoolean('use-embed') ?? false;
        await handleUpdateTag(interaction, name!, updateMessage!, shouldUseEmbed);
        break;

    case 'delete':
        await handleDeleteTag(interaction, name!);
        break;

    case 'list':
        await handleListTag(interaction);
        break;
    //
    // case 'claim':
    //     await handleClaimTag(interaction);
    //     break;
    //
    // case 'release':
    //     await handleReleaseTag(interaction);
    //     break;
    //
    // case 'transfer':
    //     await handleTransferTag(interaction);
    //     break;
    }
}

export async function handleMessageContextMenuCommand(intr: MessageContextMenuCommandInteraction) {
    const randomChars = Number(intr.id).toString(36).slice(-8);
    const modalID = 'tag-modal-' + randomChars;

    const nameInput = new TextInputBuilder()
        .setCustomId('tag-name-input' + randomChars)
        .setLabel('Tag Name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(32);

    const embedInput = new TextInputBuilder()
        .setCustomId('tag-embed-input' + randomChars)
        .setLabel('Should output be an embed? Yes? Type "Yes"')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('No')
        .setMinLength(1)
        .setMaxLength(3);

    const inputActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
    const embedActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(embedInput);

    const modal = new ModalBuilder()
        .setCustomId(modalID)
        .setTitle('Create tag')
        .addComponents(inputActionRow, embedActionRow);

    const modalFilter = async (mi: ModalSubmitInteraction) => {
        await mi.deferReply({ ephemeral: true });
        return mi.customId === modalID;
    };

    await intr.showModal(modal);

    intr.awaitModalSubmit({ time: 60_000, filter: modalFilter })
        .then(async (modalIntr) => {
            const tagNameRes = modalIntr.components[0]!.components[0]!.value;
            const shouldEmbedRes = modalIntr.components[1]!.components[0]!.value;
            const shouldEmbed = shouldEmbedRes.includes('yes');
            await handleCreateTag(modalIntr, tagNameRes, intr.targetMessage, shouldEmbed);
        })
        .catch(console.error);
}
