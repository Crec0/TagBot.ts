import fs, { existsSync } from 'fs';
import dotenv from 'dotenv';
import { Client, ActivityType, ApplicationCommandType, ApplicationCommandOptionType } from 'discord.js';

function jsonToBase64(object) {
	const json = JSON.stringify(object);
	return Buffer.from(json).toString("base64");
}
  
function base64ToJson(base64String) {
	const json = Buffer.from(base64String, "base64").toString();
	return JSON.parse(json);
}

function readTags() {
	return existsSync('./tags.json') ? JSON.parse(fs.readFileSync('./tags.json')) : {};
}

function writeTags(tags) {
	fs.writeFileSync(
		'./tags.json',
		JSON.stringify(tags, (key, value) => value ?? undefined, 3)
	);
}

export const client = new Client({
	intents: [],
	allowedMentions: { parse: [] },
	presence: {
		activities: [{ name: '/tag', type: ActivityType.Listening }]
	}
});

dotenv.config();
await client.login(process.env.DISCORD_TOKEN);
