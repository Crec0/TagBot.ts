import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { getTagPreparedStatement } from '../prepared-statements.js';
import { db, tagsTable } from '../database.js';
import { eq } from 'drizzle-orm';


export async function handleClaimTag(interaction: ChatInputCommandInteraction, tagID: string) {
    const tag = getTagPreparedStatement.get({ tag_id: tagID });

    if ( tag == null ) {
        await interaction.editReply('Tag name provided is invalid. Please check and try again.');
        return;
    }

    if ( tag.ownerUserID != null ) {
        await interaction.editReply(`The tag is already owned by ${tag.ownerUsername}`);
        return;
    }

    db.update(tagsTable)
        .set({
            ownerUsername: interaction.user.username,
            ownerUserID: interaction.user.id,
        })
        .where(eq(tagsTable.tagID, tag.tagID))
        .prepare(true)
        .run();

    await interaction.editReply(`Tag "${tag.tagName}" successfully claimed`);
}

export async function handleReleaseTag(interaction: ChatInputCommandInteraction, tagID: string) {
    const tag = getTagPreparedStatement.get({ tag_id: tagID });

    if ( tag == null ) {
        await interaction.editReply('Tag name provided is invalid. Please check and try again.');
        return;
    }

    if ( tag.ownerUserID == null ) {
        await interaction.editReply('The tag is already unclaimed.');
        return;
    }

    if ( interaction.user.id !== tag.ownerUserID && !interaction.memberPermissions!.has(PermissionsBitField.Flags.Administrator) ) {
        await interaction.editReply('You are not the owner of the tag.');
        return;
    }

    db.update(tagsTable)
        .set({
            ownerUsername: null,
            ownerUserID: null,
        })
        .where(eq(tagsTable.tagID, tag.tagID))
        .prepare(true)
        .run();

    await interaction.editReply(`Tag "${tag.tagName}" successfully released in the wild.`);
}

export async function handleTransferTag(interaction: ChatInputCommandInteraction, tagID: string) {
    const tag = getTagPreparedStatement.get({ tag_id: tagID });
    const newOwner = interaction.options.getUser('new-owner')!;

    if ( tag == null ) {
        await interaction.editReply('Tag name provided is invalid. Please check and try again.');
        return;
    }

    if ( tag.ownerUserID == null ) {
        await interaction.editReply('The tag is unclaimed. Cannot transfer unclaimed tags.');
        return;
    }

    if ( interaction.user.id !== tag.ownerUserID && !interaction.memberPermissions!.has(PermissionsBitField.Flags.Administrator) ) {
        await interaction.editReply('You are not the owner of the tag.');
        return;
    }

    db.update(tagsTable)
        .set({
            ownerUsername: newOwner.username,
            ownerUserID: newOwner.id,
        })
        .where(eq(tagsTable.tagID, tag.tagID))
        .prepare(true)
        .run();

    await interaction.editReply(`Tag "${tag.tagName}" successfully transferred to ${newOwner.username}`);
}