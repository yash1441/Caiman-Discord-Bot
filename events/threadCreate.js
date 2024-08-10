const { Events, ChannelType } = require("discord.js");
const lark = require("../utils/lark.js");
require("dotenv").config();

module.exports = {
	name: Events.ThreadCreate,
	async execute(thread) {
		if (
			thread.parent.type != ChannelType.GuildForum ||
			thread.parentId != process.env.VOTE_SUGGESTION_ID
		)
			return;

		const message = await thread.fetchStarterMessage();
		const embed = await message.embeds[0];
		const discordId = embed.data.footer.text.split("-", 2)[0];
		const rid = embed.data.footer.text.split("-", 2)[1];

		if (!embed) return;

		await message.react("✅").then(message.react("❌"));

		const tag = thread.parent.availableTags.find(
			(tag) => tag.id == thread.appliedTags[0]
		);

		const data = {
			Title: thread.name,
			Details: embed.data.description,
			Category: tag.name,
			"✅": 0,
			"❌": 0,
			"Discord ID": discordId,
			"Discord Name": embed.data.author.name,
			"RID": rid,
		};

		const success = await lark.createRecord(
			process.env.FEEDBACK_POOL_BASE,
			process.env.SUGGESTIONS_TABLE,
			{ fields: data }
		);

		if (!success) console.log("Failed to create record in lark");
	},
};