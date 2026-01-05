import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import config from "../../config/config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Generate bot invite link with proper permissions"),

  async execute(interaction) {
    // Pake permission value langsung (Administrator = 8)
    const permissionValue = "8"; // Administrator permission

    const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&permissions=${permissionValue}&scope=bot%20applications.commands`;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle("🔗 Bot Invite Link")
      .setDescription(
        `Use this link to invite or re-authorize the bot with Administrator permissions.\n\n**Invite Link:**\n${inviteLink}`
      )
      .addFields(
        {
          name: "📋 Included Permissions",
          value:
            "• **Administrator** (Full Access)\n• All channels & roles\n• All moderation features\n• Thread management\n• Message management",
          inline: false,
        },
        {
          name: "⚠️ Note",
          value:
            "Re-authorizing will update bot permissions without kicking it from the server.",
          inline: false,
        }
      )
      .setFooter({ text: "Click the link above to authorize" })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};
