import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import config from "../../config/config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle("🤖 Bot Commands")
      .setDescription("Here are all available commands:")
      .addFields(
        {
          name: "📋 Whitelist Commands",
          value:
            "`/whitelist` - Whitelist a user\n`/check` - Check whitelist status\n`/remove-whitelist` - Remove user from whitelist",
          inline: false,
        },
        {
          name: "🤝 Middleman Commands",
          value: "`/mm` - Open a middleman ticket",
          inline: false,
        },
        {
          name: "ℹ️ General Commands",
          value: "`/help` - Show this message\n`/ping` - Check bot latency",
          inline: false,
        }
      )
      .setFooter({ text: "Use slash commands (/) to interact with the bot" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
