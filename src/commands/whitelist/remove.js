import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Whitelist from "../../database/models/Whitelist.js";
import config from "../../config/config.js";
import getSettings from "../../utils/getsettings.js";

export default {
  data: new SlashCommandBuilder()
    .setName("unwhitelist")
    .setDescription("Remove a user from whitelist")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to remove from whitelist")
        .setRequired(true)
    ),

  async execute(interaction) {
    // Check permission
    if (
      !interaction.member.roles.cache.has(config.roles.middleman) &&
      !interaction.member.roles.cache.has(config.roles.admin)
    ) {
      return interaction.reply({
        content: "❌ You need Middleman or Admin role to use this command!",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("user");

    const whitelist = await Whitelist.findOne({
      userId: user.id,
      isActive: true,
    });

    if (!whitelist) {
      return interaction.reply({
        content: `❌ ${user.tag} is not whitelisted!`,
        ephemeral: true,
      });
    }

    // Deactivate whitelist
    whitelist.isActive = false;
    await whitelist.save();

    // Remove roles
    const member = await interaction.guild.members.fetch(user.id);

    // Remove whitelisted customer role
    if (
      config.roles.whitelistedCustomer &&
      member.roles.cache.has(config.roles.whitelistedCustomer)
    ) {
      await member.roles.remove(config.roles.whitelistedCustomer);
    }

    // Remove Loyal Customer role if they have it
    if (member.roles.cache.has(config.roles.loyalCustomer)) {
      await member.roles.remove(config.roles.loyalCustomer);
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle("❌ Whitelist Removed")
      .setDescription(`${user} has been removed from whitelist`)
      .addFields(
        { name: "👤 User", value: `${user} (${user.tag})`, inline: true },
        { name: "👮 Removed By", value: `${interaction.user}`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Get settings for log channel
    const settings = await getSettings(interaction.guild.id);

    // Log if configured
    if (settings.logChannel) {
      const logChannel = interaction.guild.channels.cache.get(
        settings.logChannel
      );
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle("📋 Whitelist Removed")
          .setDescription(`${user} has been removed from whitelist`)
          .addFields(
            { name: "User", value: `${user} (${user.id})`, inline: true },
            { name: "Removed By", value: `${interaction.user}`, inline: true }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  },
};
