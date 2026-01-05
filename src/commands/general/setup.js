import { SlashCommandBuilder, EmbedBuilder, ChannelType } from "discord.js";
import Settings from "../../database/models/Settings.js";
import config from "../../config/config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Setup bot channels")
    .addChannelOption((option) =>
      option
        .setName("log_channel")
        .setDescription("Channel for all logs (whitelist, MM, etc)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("mm_channel")
        .setDescription("Channel where MM tickets will be created")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
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

    const logChannel = interaction.options.getChannel("log_channel");
    const mmChannel = interaction.options.getChannel("mm_channel");

    // Save or update settings
    await Settings.findOneAndUpdate(
      { guildId: interaction.guild.id },
      {
        guildId: interaction.guild.id,
        logChannel: logChannel.id,
        mmChannel: mmChannel.id,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle("✅ Bot Setup Complete")
      .setDescription("Bot channels have been configured successfully!")
      .addFields(
        { name: "📋 Log Channel", value: `${logChannel}`, inline: false },
        { name: "🤝 MM Ticket Channel", value: `${mmChannel}`, inline: false }
      )
      .setFooter({ text: "You can run /setup again to update these settings" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
