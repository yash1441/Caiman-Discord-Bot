const {
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ComponentType,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    bold,
    inlineCode,
    codeBlock,
    channelMention,
    userMention,
} = require("discord.js");
require("dotenv").config();

module.exports = {
    cooldown: 10,
    data: {
        name: "add-suggestion",
    },
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = await interaction.client.channels.fetch(
            process.env.VOTE_SUGGESTION_ID
        );
        const availableTags = channel.availableTags;

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("suggestion-category")
            .setPlaceholder("選擇一個建議分類");

        for (const tag of availableTags) {
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(tag.name)
                    .setValue(tag.name)
            );
        }

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const modal = new ModalBuilder().setCustomId("suggestion-modal");

        const modalRow1 = new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId("title")
                .setLabel("標題")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("為您的建議擬一個小標題")
        );
        const modalRow2 = new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId("rid")
                .setLabel("RID")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("在此輸入您的遊戲ID")
        );
        const modalRow3 = new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId("description")
                .setLabel("描述")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("在此詳細描述您的建議")
        );

        modal.addComponents(modalRow1, modalRow2, modalRow3);

        await interaction.editReply({
            content: "**建議類別**",
            components: [row],
        });

        const botReply = await interaction.fetchReply();

        const collector = botReply.createMessageComponentCollector({
            time: 10_000,
            componentType: ComponentType.StringSelect,
        });

        collector.on("collect", async (selectMenuInteraction) => {
            const category = selectMenuInteraction.values[0];
            modal.setTitle(category);

            await interaction.editReply({
                content:
                    userMention(selectMenuInteraction.user.id) +
                    " 已選擇 " +
                    inlineCode(category),
                components: [],
            });

            await selectMenuInteraction.showModal(modal);

            const modalReply = await selectMenuInteraction
                .awaitModalSubmit({
                    time: 3_00_000,
                    filter: (modalInteraction) =>
                        modalInteraction.user.id ===
                        selectMenuInteraction.user.id,
                })
                .catch(() => {
                    interaction.editReply({
                        content: "表單已過期",
                        components: [],
                    });
                    setTimeout(() => interaction.deleteReply(), 10_000);
                    return null;
                });

            if (!modalReply) return;

            await modalReply.reply({
                content: bold(modal.data.title),
                ephemeral: true,
            });

            await modalReply.deleteReply();

            await interaction.editReply({
                content:
                    "您的建議已提交。請等待管理員批准或拒絕。如果被批准，將很快會在 " +
                    channelMention(process.env.VOTE_SUGGESTION_ID) +
                    " 中顯示.\n\n" +
                    bold(modal.data.title) +
                    "\n" +
                    codeBlock(
                        modalReply.fields.getTextInputValue("description")
                            .length < 2000
                            ? modalReply.fields.getTextInputValue("description")
                            : modalReply.fields
                                  .getTextInputValue("description")
                                  .slice(0, 1000) + "..."
                    ),
            });

            collector.stop();

            await sendSuggestionAdmin(modalReply, modal.data.title);
        });

        collector.on("end", (collected, reason) => {
            if (reason === "time" && !collected.size) {
                interaction.editReply({
                    content: "所選內容已過期",
                    components: [],
                });
                setTimeout(() => interaction.deleteReply(), 10_000);
            }
        });
    },
};

async function sendSuggestionAdmin(interaction, category) {
    const user = interaction.user;
    const title = interaction.fields.getTextInputValue("title");
    const rid = interaction.fields.getTextInputValue("rid");
    const description = interaction.fields.getTextInputValue("description");

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .addFields(
            { name: "類別", value: category, inline: true },
            { name: "RID", value: rid, inline: true }
        )
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setFooter({ text: user.id + "-" + rid })
        .setColor(process.env.EMBED_COLOR);

    const approveButton = new ButtonBuilder()
        .setCustomId("approve-suggestion")
        .setLabel("批准")
        .setStyle(ButtonStyle.Success);

    const denyButton = new ButtonBuilder()
        .setCustomId("deny-suggestion")
        .setLabel("拒絕")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(approveButton, denyButton);

    const channel = await interaction.client.channels.fetch(
        process.env.DECIDE_SUGGESTION_ID
    );
    await channel.send({ embeds: [embed], components: [row] });
}
