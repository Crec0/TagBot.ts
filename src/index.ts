import dotenv from 'dotenv';
import { ActivityType, Client, GatewayIntentBits, type Interaction, type RepliableInteraction } from 'discord.js';
import { handleAutocomplete, handleButton, handleChatCommand, handleMessageContextMenuCommand } from './command.js';
import { Logger } from '@tsed/logger';
import '@tsed/logger-file';


export const logger = new Logger('Main');

logger.appenders.set('file', {
    type: 'file',
    filename: `./logs/latest.log`,
    layout: { type: 'basic' },
    pattern: '.yyyy-MM-dd',
});

logger.appenders.set('console', {
    type: 'console',
});

dotenv.config();

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
    allowedMentions: { parse: [] },
    presence: {
        activities: [ { name: '/tag', type: ActivityType.Listening } ],
    },
});

function onError(interaction: RepliableInteraction) {
    return async (error: Error) => {
        logger.error(error);
        if ( interaction.deferred || interaction.replied ) {
            await interaction.editReply({ content: error.message });
        } else {
            await interaction.reply({ content: error.message, ephemeral: true });
        }
    };
}

client.on('interactionCreate', async (interaction: Interaction) => {
    if ( interaction.isAutocomplete() ) {
        handleAutocomplete(interaction).catch(logger.info);

    } else if ( interaction.isMessageContextMenuCommand() ) {
        handleMessageContextMenuCommand(interaction).catch(onError(interaction));

    } else if ( interaction.isChatInputCommand() ) {
        handleChatCommand(interaction).catch(onError(interaction));

    } else if ( interaction.isButton() ) {
        handleButton(interaction).catch(onError(interaction));
    }
});

client.once('ready', async () => {
    logger.info(`${ client.user!.tag } is online!`);
    // await client.application!.commands.set(commands);
});

await client.login(process.env.DISCORD_TOKEN);