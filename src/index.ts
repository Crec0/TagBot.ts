import dotenv from 'dotenv';
import { ActivityType, Client, GatewayIntentBits, Guild, Interaction } from 'discord.js';
import { commands, handleAutocomplete, handleChatCommand, handleMessageContextMenuCommand } from './commands.js';


dotenv.config();

export const client = new Client( {
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
    allowedMentions: { parse: [] },
    presence: {
        activities: [ { name: '/tag', type: ActivityType.Listening } ],
    },
} );

client.on( 'interactionCreate', async ( interaction: Interaction ) => {
    if ( interaction.isAutocomplete() ) {
        await handleAutocomplete( interaction ).catch( console.log );

    } else if ( interaction.isMessageContextMenuCommand() ) {
        await handleMessageContextMenuCommand( interaction ).catch( error => {
            console.log( error );
            if ( interaction.deferred || interaction.replied ) {
                interaction.editReply( { content: 'There was an error while executing this command' } );
            } else {
                interaction.reply( { content: 'There was an error while executing this command', ephemeral: true } );
            }
        } );

    } else if ( interaction.isChatInputCommand() ) {
        await handleChatCommand( interaction ).catch( error => {
            console.log( error );
            if ( interaction.deferred ) {
                interaction.editReply( { content: 'There was an error while executing this command' } );
            } else {
                interaction.reply( { content: 'There was an error while executing this command', ephemeral: true } );
            }
        } );

    }
} );

client.once( 'ready', async () => {
    console.log( `${ client.user!.tag } is online!` );
    await client.application!.commands.set( commands );
} );

await client.login( process.env.DISCORD_TOKEN );