import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    Message,
} from 'discord.js';
import { db, tagsTable } from '../database.js';
import { and, eq, isNull, sql } from 'drizzle-orm';


type Paginator = {
    title: string
    tags: string[]
    currentPage: number
    lastInteracted: number
    message: Message
}

const PREVIOUS_BUTTON_ID = 'list:previous:';
const NEXT_BUTTON_ID = 'list:next:';
const DELETE_BUTTON_ID = 'list:delete:';

const ITEMS_PER_PAGE = 15;
const activePaginators: Map<string, Paginator> = new Map<string, Paginator>();

setInterval(() => {
    const keysToRemove = [];
    const now = Date.now();
    for ( let [ k, v ] of activePaginators.entries() ) {
        if ( now - v.lastInteracted > 10_000 ) {
            keysToRemove.push(k);
        }
    }
    keysToRemove.forEach(async k => {
        await activePaginators.get(k)?.message.delete();
        console.log(`Deleting ${ k }`);
        activePaginators.delete(k);
    });
}, 10_000);

export async function handleListTag(interaction: ChatInputCommandInteraction) {
    const reply = await interaction.deferReply({ fetchReply: true });

    const conditions = [
        eq(tagsTable.guildID, sql.placeholder('guild_id')),
    ];

    const username = interaction.options.getUser('user')?.username;
    const isUnclaimed = interaction.options.getBoolean('is-unclaimed') ?? false;

    if ( username != null ) {
        conditions.push(eq(tagsTable.ownerUsername, sql.placeholder('username')));
    } else if ( isUnclaimed ) {
        conditions.push(isNull(tagsTable.ownerUsername));
    }

    const tags = db
        .select()
        .from(tagsTable)
        .where(and(...conditions))
        .prepare(false)
        .all({
            guild_id: interaction.guild!.id,
            username: username,
        });

    const titlePrefix = username == null && isUnclaimed ? 'Unclaimed' : 'All';
    const titleSuffix = username != null ? `Owned by ${ username }` : '';
    const title = `${ titlePrefix } Tags ${ titleSuffix }`.trim();

    const paginator: Paginator = { title: title, tags: [], currentPage: 0, lastInteracted: Date.now(), message: reply };
    activePaginators.set(reply.id, paginator);

    for ( const tag of tags ) {
        paginator.tags.push(`**${ tag.tagName }** (ID: ${ tag.tagID }), (*Owner: ${ tag.ownerUsername ?? 'Unclaimed' }*)`);
    }

    await interaction.editReply(paginatorPage(reply, paginator));
}

export async function listOnButton(intr: ButtonInteraction, splits: [ string, string, string ]) {
    const paginator = activePaginators.get(splits[2]);
    if ( paginator == null ) {
        if ( splits[1] === 'delete' ) {
            await intr.message.delete();
        }
        return;
    }

    paginator.lastInteracted = Date.now();

    switch ( splits[1] ) {
    case 'previous':
        paginator.currentPage = Math.max(0, paginator.currentPage - 1);
        await intr.update(paginatorPage(intr.message, paginator));
        break;
    case 'next':
        const totalPages = Math.ceil(paginator.tags.length / ITEMS_PER_PAGE);
        paginator.currentPage = Math.min(totalPages - 1, paginator.currentPage + 1);
        await intr.update(paginatorPage(intr.message, paginator));
        break;
    case 'delete':
        activePaginators.delete(intr.message.id);
        await intr.message.delete();
        return;
    }
}

function paginatorPage(message: Message, paginator: Paginator) {
    const previousButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(PREVIOUS_BUTTON_ID + message.id)
        .setEmoji('\u2B05')
        .setDisabled(paginator.currentPage === 0);

    const nextButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(NEXT_BUTTON_ID + message.id)
        .setEmoji('\u27A1')
        .setDisabled(paginator.currentPage + 1 === Math.ceil(paginator.tags.length / ITEMS_PER_PAGE));

    const deleteButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setCustomId(DELETE_BUTTON_ID + message.id)
        .setEmoji('\uD83D\uDDD1');

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents([
        previousButton, nextButton, deleteButton,
    ]);

    const embed = new EmbedBuilder({
        color: 0x0EA5E9,
        title: paginator.title,
        description: paginator.tags
            .slice(paginator.currentPage * ITEMS_PER_PAGE, ( paginator.currentPage + 1 ) * ITEMS_PER_PAGE)
            .map(line => `${ paginator.currentPage * ITEMS_PER_PAGE + 1 }. ${ line }`)
            .join('\n'),
    });

    return {
        embeds: [ embed ],
        components: [ actionRow ],
    };
}
