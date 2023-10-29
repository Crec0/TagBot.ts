import dotenv from 'dotenv';
import { ActivityType, Client, GatewayIntentBits, type Interaction, type RepliableInteraction } from 'discord.js';
import {
    commands,
    handleAutocomplete,
    handleButton,
    handleChatCommand,
    handleMessageContextMenuCommand,
} from './command.js';


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
        console.error(error);
        if ( interaction.deferred || interaction.replied ) {
            await interaction.editReply({ content: error.message });
        } else {
            await interaction.reply({ content: error.message, ephemeral: true });
        }
    };
}

client.on('interactionCreate', async (interaction: Interaction) => {
    if ( interaction.isAutocomplete() ) {
        handleAutocomplete(interaction).catch(console.log);

    } else if ( interaction.isMessageContextMenuCommand() ) {
        handleMessageContextMenuCommand(interaction).catch(onError(interaction));

    } else if ( interaction.isChatInputCommand() ) {
        handleChatCommand(interaction).catch(onError(interaction));

    } else if ( interaction.isButton() ) {
        handleButton(interaction).catch(onError(interaction));
    }
});

client.once('ready', async () => {
    console.log(`${ client.user!.tag } is online!`);
    await client.application!.commands.set(commands);
});

await client.login(process.env.DISCORD_TOKEN);