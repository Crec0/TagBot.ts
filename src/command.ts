import {
    ActionRowBuilder,
    ApplicationCommandType,
    AutocompleteInteraction,
    ButtonInteraction,
    ChannelType,
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder, DiscordAPIError,
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
import { handleListTag, listOnButton } from './subcommands/list.js';
import { handleUpdateTag } from './subcommands/update.js';
import { handleCreateTag } from './subcommands/create.js';
import { bitapSearch } from './bitap.js';

import { handleClaimTag, handleReleaseTag, handleTransferTag } from './subcommands/ownership.js';
import { logger } from './index.js';


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
                        .setDescription('User to ping on response.'),
                )
                .addBooleanOption(
                    new SlashCommandBooleanOption()
                        .setName('use-embed')
                        .setDescription('Should the message be sent as an embed. Defaults to true.'),
                ),
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName('preview')
                .setDescription('Sends an ephemeral message giving you a preview of how the output would look like.')
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
                        .setName('message-id-link')
                        .setDescription('Message id or link of the message you want to create a tag for')
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
                        .setName('only-unclaimed')
                        .setDescription('Only display tags unclaimed tags'),
                )
                .addBooleanOption(
                    new SlashCommandBooleanOption()
                        .setName('ephemeral')
                        .setDescription('Shows list as ephemeral message'),
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
                        .setName('message-id-link')
                        .setDescription('Message id or link of the message you want to update the tag with.')
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
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName('claim')
                .setDescription('Claims a tag if the specified tag is unclaimed')
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
                .setName('release')
                .setDescription('Releases ownership of the specified tag.')
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
                .setName('transfer')
                .setDescription('Transfers ownership of the specified tag to another user.')
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName('name')
                        .setDescription('Name of the tag')
                        .setRequired(true)
                        .setAutocomplete(true),
                )
                .addUserOption(
                    new SlashCommandUserOption()
                        .setName('new-owner')
                        .setDescription('New owner of the tag')
                        .setRequired(true),
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
            return { tag: tag, score: bitapSearch(tag.tagName, focusedValue) };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 25)
        .map(s => {
            return {
                name: `${ s.tag.tagName }, Owner: ${ s.tag.ownerUsername ?? 'Unclaimed' } (ID: ${ s.tag.tagID })`,
                value: `${ s.tag.tagID }`,
            };
        });

    await interaction.respond(tagNames);
}

async function fetchMessageOrThrow(interaction: ChatInputCommandInteraction): Promise<Message> {
    const input = interaction.options.getString('message-id-link')!.trim();
    const regex = /(?:(?<channel>\d+)\/)?(?<message>\d+)$/;
    const match = input.match(regex);

    const channelId = match?.groups?.channel;
    const messageId = match?.groups?.message;

    let message = null;

    if ( messageId == null ) {
        throw Error('Message link or id provided is invalid. Please check and try again.');
    }

    try {
        const channel = channelId == null
            ? interaction.channel!
            : await interaction.guild!.channels.fetch(channelId, { force: true });

        if ( channel == null || channel.type == ChannelType.GuildCategory ) {
            throw Error('Channel is invalid or unreachable');
        }

        message = await channel.messages.fetch({ message: messageId, force: true });
    } catch ( e ) {
        if ( e instanceof DiscordAPIError ) {
            switch ( e.code ) {
            case 10003:
                throw Error('Channel ID provided in the link was either invalid or from a different guild. Make sure the link is from this guild.');
            case 10008:
                throw Error('Message ID was either invalid or from a different channel. Make sure the link is from this guild or in case of id, its from this channel.');
            }
        }
        throw e;
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
        await handleGetTag(interaction, name!, false);
        break;

    case 'preview':
        await handleGetTag(interaction, name!, true);
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

    case 'claim':
        await interaction.deferReply({ ephemeral: true });
        await handleClaimTag(interaction, name!);
        break;

    case 'release':
        await interaction.deferReply({ ephemeral: true });
        await handleReleaseTag(interaction, name!);
        break;

    case 'transfer':
        await interaction.deferReply({ ephemeral: true });
        await handleTransferTag(interaction, name!);
        break;
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
            const shouldEmbed = shouldEmbedRes.toLowerCase().includes('yes');
            await handleCreateTag(modalIntr, tagNameRes, intr.targetMessage, shouldEmbed);
        })
        .catch(logger.error);
}


export async function handleButton(interaction: ButtonInteraction) {
    const splits = interaction.customId.split(':');
    if ( splits.length > 0 && splits[0] == 'list' ) {
        await listOnButton(interaction, splits as unknown as [ string, string, string ]);
    }
}