import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Whitelist from "../../database/models/Whitelist.js";
import config from "../../config/config.js";
import getSettings from "../../utils/getsettings.js";

export default {
  data: new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Whitelist a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to whitelist")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("hours")
        .setDescription("Number of hours to whitelist the user for")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(8760)
    )
    .addStringOption((option) =>
      option
        .setName("note")
        .setDescription("Note to add to the whitelist")
        .setRequired(false)
    ),

  async execute(interaction) {
    // Check permission (owner bypass)
    if (
      interaction.user.id !== config.ownerId &&
      !interaction.member.roles.cache.has(config.roles.middleman) &&
      !interaction.member.roles.cache.has(config.roles.admin)
    ) {
      return interaction.reply({
        content: "❌ You need Middleman or Admin role to use this command!",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("user");
    const hours = interaction.options.getInteger("hours");
    const note = interaction.options.getString("note");

    // Check if user is already whitelisted
    let whitelist = await Whitelist.findOne({ userId: user.id });

    if (whitelist && whitelist.isActive) {
      // User already whitelisted, increment count
      whitelist.whitelistCount += 1;

      // Update expiry if hours provided
      if (hours) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + hours);
        whitelist.expiresAt = expiresAt;
      }

      // Update note if provided
      if (note) {
        whitelist.note = note;
      }

      await whitelist.save();
    } else {
      // Create new whitelist
      const expiresAt = hours
        ? new Date(Date.now() + hours * 60 * 60 * 1000)
        : null;

      whitelist = await Whitelist.create({
        userId: user.id,
        username: user.tag,
        whitelistedBy: interaction.user.id,
        whitelistedByUsername: interaction.user.tag,
        note: note || null,
        expiresAt: expiresAt,
        whitelistCount: 1,
        isActive: true,
      });
    }

    // Give user the whitelisted role (x8 cust)
    const member = await interaction.guild.members.fetch(user.id);

    // Add whitelisted customer role
    if (config.roles.whitelistedCustomer) {
      if (!member.roles.cache.has(config.roles.whitelistedCustomer)) {
        await member.roles.add(config.roles.whitelistedCustomer);
      }
    }

    // Check if user should get Loyal Customer role (after 3x whitelist)
    if (whitelist.whitelistCount >= config.loyalCustomerThreshold) {
      if (!member.roles.cache.has(config.roles.loyalCustomer)) {
        await member.roles.add(config.roles.loyalCustomer);
      }
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(config.colors.purple)
      .setTitle("✅ User Whitelisted")
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "👤 User", value: `${user} (${user.tag})`, inline: true },
        { name: "📝 Note", value: note || "No note provided", inline: true },
        {
          name: "⏰ Expires",
          value: hours
            ? `<t:${Math.floor(whitelist.expiresAt.getTime() / 1000)}:R>`
            : "Never",
          inline: true,
        },
        {
          name: "📊 Whitelist Count",
          value: `${whitelist.whitelistCount}x`,
          inline: true,
        },
        {
          name: "👮 Whitelisted By",
          value: `${interaction.user}`,
          inline: true,
        },
        {
          name: "⭐ Status",
          value:
            whitelist.whitelistCount >= config.loyalCustomerThreshold
              ? "👑 Loyal Customer"
              : "✅ Whitelisted",
          inline: true,
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    // Get settings for log channel
    const settings = await getSettings(interaction.guild.id);

    // Send callback message to user (mention them) - PUBLIC
    const callbackEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setDescription(`${user} You have been whitelisted!\n\n**Have fun!** 🎉`)
      .setTimestamp();

    await interaction.channel.send({ embeds: [callbackEmbed] });

    // Send to log channel if configured
    if (settings.logChannel) {
      const logChannel = interaction.guild.channels.cache.get(
        settings.logChannel
      );
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle("📋 Whitelist Log")
          .setDescription(`${user} has been whitelisted`)
          .addFields(
            { name: "User", value: `${user} (${user.id})`, inline: true },
            {
              name: "Whitelisted By",
              value: `${interaction.user}`,
              inline: true,
            },
            {
              name: "Count",
              value: `${whitelist.whitelistCount}x`,
              inline: true,
            },
            { name: "Note", value: note || "No note", inline: false },
            {
              name: "Expires",
              value: hours
                ? `<t:${Math.floor(whitelist.expiresAt.getTime() / 1000)}:F>`
                : "Never",
              inline: false,
            }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  },
};
