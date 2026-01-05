import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import config from "../../config/config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  async execute(interaction) {
    const sent = await interaction.deferReply({ fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle("🏓 Pong!")
      .addFields(
        { name: "📡 Bot Latency", value: `${latency}ms`, inline: true },
        { name: "🌐 API Latency", value: `${apiLatency}ms`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
