const { Events } = require("discord.js");
const lark = require("../utils/lark.js");
require("dotenv").config();

module.exports = {
	name: Events.MessageReactionAdd,
	async execute(reaction, user) {
		if (reaction.partial) {
			try {
				await reaction.fetch();
			} catch (error) {
				return console.error(error);
			}
		}

		if (
			user.id == process.env.BOT_ID ||
			(reaction.emoji.name != "✅" && reaction.emoji.name != "❌") ||
			reaction.message.channel.parentId != process.env.VOTE_SUGGESTION_ID
		)
			return;

		const acceptCount =
			reaction.message.reactions.cache.get("✅").count - 1;
		const rejectCount =
			reaction.message.reactions.cache.get("❌").count - 1;

		const response = await lark.listRecords(
			process.env.FEEDBACK_POOL_BASE,
			process.env.SUGGESTIONS_TABLE,
			{
				filter:
					'AND(CurrentValue.[Title] = "' +
					reaction.message.channel.name +
					'", CurrentValue.[Discord Name] = "' +
					reaction.message.embeds[0].data.author.name +
					'")',
			}
		);

		if (!response)
			return console.warn(
				"Could not fetch Suggestion Title: " +
					reaction.message.channel.name
			);

		const success = await lark.updateRecord(
			process.env.FEEDBACK_POOL_BASE,
			process.env.SUGGESTIONS_TABLE,
			response.items[0].record_id,
			{ fields: { "✅": acceptCount, "❌": rejectCount } }
		);

		if (!success)
			return console.warn(
				"Could not add " +
					reaction.emoji.name +
					" to " +
					reaction.message.id
			);
	},
};