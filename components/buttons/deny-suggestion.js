const { EmbedBuilder, userMention } = require("discord.js");
require("dotenv").config();

module.exports = {
	cooldown: 10,
	data: {
		name: "deny-suggestion",
	},
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		const embed = interaction.message.embeds[0];

		const deniedEmbed = EmbedBuilder.from(embed)
			.setColor(process.env.EMBED_COLOR_DENIED)
			.addFields({
				name: "決定",
				value: userMention(interaction.user.id),
				inline: true,
			});

		await interaction.message
			.edit({ embeds: [deniedEmbed], components: [] })
			.then(() => interaction.deleteReply());
	},
};