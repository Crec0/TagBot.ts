import dotenv from 'dotenv';
import { ActivityType, Client, GatewayIntentBits, Interaction } from 'discord.js';
import { commands, handleAutocomplete, handleChatCommand, handleMessageContextMenuCommand } from './command.js';


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

client.on('interactionCreate', async (interaction: Interaction) => {
    if ( interaction.isAutocomplete() ) {
        await handleAutocomplete(interaction).catch(console.log);

    } else if ( interaction.isMessageContextMenuCommand() ) {
        handleMessageContextMenuCommand(interaction).catch(error => {
            console.error(error);
            if ( interaction.deferred || interaction.replied ) {
                interaction.editReply({ content: error.message });
            } else {
                interaction.reply({ content: error.message, ephemeral: true });
            }
        });

    } else if ( interaction.isChatInputCommand() ) {
        handleChatCommand(interaction).catch((error: Error) => {
            console.error(error);
            if ( interaction.deferred || interaction.replied ) {
                interaction.editReply({ content: error.message });
            } else {
                interaction.reply({ content: error.message, ephemeral: true });
            }
        });

    }
});

client.once('ready', async () => {
    console.log(`${ client.user!.tag } is online!`);
    await client.application!.commands.set(commands);
});

await client.login(process.env.DISCORD_TOKEN);