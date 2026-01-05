import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import config from "../../config/config.js";
import getSettings from "../../utils/getsettings.js";

export default {
  data: new SlashCommandBuilder()
    .setName("middleman")
    .setDescription("Send middleman panel to current channel")
    .setDefaultMemberPermissions(0), // Admin only

  async execute(interaction) {
    // Check permission
    if (
      !interaction.member.roles.cache.has(config.roles.admin) &&
      !interaction.member.permissions.has("Administrator")
    ) {
      return interaction.reply({
        content: "❌ Only admins can use this command!",
        ephemeral: true,
      });
    }

    // Check if MM channel is configured
    const settings = await getSettings(interaction.guild.id);
    if (!settings.mmChannel) {
      return interaction.reply({
        content: "❌ MM channel not configured! Please run `/setup` first.",
        ephemeral: true,
      });
    }

    // Create user select menu
    const selectMenu = new UserSelectMenuBuilder()
      .setCustomId("mm_select_partner")
      .setPlaceholder("👤 Select your trading partner")
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor(config.colors.purple)
      .setTitle("🤝 Middleman Service Panel")
      .setDescription(
        "Open a middleman ticket to ensure safe transactions between buyers and sellers."
      )
      .addFields(
        {
          name: "📋 How it works",
          value:
            "**1.** Select your trading partner from the dropdown below\n**2.** Provide transaction details\n**3.** Middleman will join and oversee the trade\n**4.** Complete transaction safely",
          inline: false,
        },
        {
          name: "💰 Fee Structure",
          value:
            "```\n< Rp 10.000              → Rp 1.000\nRp 10.000 - Rp 50.000    → Rp 2.000\nRp 50.001 - Rp 100.000   → Rp 5.000\nRp 100.001 - Rp 200.000  → Rp 8.000\nRp 200.001 - Rp 299.999  → Rp 12.000\n≥ Rp 300.000             → 5% flat```",
          inline: false,
        },
        {
          name: "⚠️ Important Rules",
          value:
            "• Only use for legitimate trades\n• Do not abuse the system\n• Follow middleman instructions\n• Violations result in penalties",
          inline: false,
        }
      )
      .setFooter({ text: "Select your trading partner to begin" })
      .setTimestamp();

    await interaction.channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: "✅ Middleman panel sent!",
      ephemeral: true,
    });
  },
};
