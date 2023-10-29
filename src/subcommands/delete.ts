import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { getTagPreparedStatement } from '../prepared-statements.js';
import { attachmentTable, db, tagsTable } from '../database.js';
import { eq } from 'drizzle-orm';


export async function handleDeleteTag(interaction: ChatInputCommandInteraction, tagID: string) {
    const tag = getTagPreparedStatement.get({ tag_id: tagID });

    if ( tag == null ) {
        await interaction.reply({
            ephemeral: true,
            content: 'Tag name provided is invalid. Please check and try again.',
        });
        return;
    }

    if ( interaction.user.id !== tag.ownerUserID && !interaction.memberPermissions!.has(PermissionsBitField.Flags.Administrator) ) {
        await interaction.reply({
            ephemeral: true,
            content: 'You are not the owner of the tag.',
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
