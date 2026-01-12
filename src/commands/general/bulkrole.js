import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import config from "../../config/config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("bulkrole")
    .setDescription("Add or remove role from all members (Owner only)")
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role to add/remove")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Add or remove role")
        .setRequired(true)
        .addChoices(
          { name: "Add Role", value: "add" },
          { name: "Remove Role", value: "remove" }
        )
    )
    .setDefaultMemberPermissions(0),

  async execute(interaction) {
    // STRICT: Owner only
    if (interaction.user.id !== config.ownerId) {
      return interaction.reply({
        content: "❌ This command is restricted to the bot owner only!",
        ephemeral: true,
      });
    }

    const role = interaction.options.getRole("role");
    const action = interaction.options.getString("action");

    // Safety checks
    if (role.managed) {
      return interaction.reply({
        content: "❌ Cannot modify managed roles (bot roles, boosters, etc)!",
        ephemeral: true,
      });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({
        content:
          "❌ Bot cannot manage this role (role is higher than bot's highest role)!",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    // Fetch all members
    const members = await interaction.guild.members.fetch();

    const stats = {
      total: 0,
      success: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    const startTime = Date.now();

    // Progress embed
    const progressEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle("⚙️ Bulk Role in Progress")
      .setDescription(
        `${action === "add" ? "Adding" : "Removing"} ${role} ${
          action === "add" ? "to" : "from"
        } all members...`
      )
      .addFields({ name: "📊 Status", value: "Processing...", inline: false })
      .setTimestamp();

    await interaction.editReply({ embeds: [progressEmbed] });

    // Process members
    for (const [id, member] of members) {
      // Skip bots
      if (member.user.bot) {
        stats.skipped++;
        continue;
      }

      stats.total++;

      try {
        if (action === "add") {
          // Check if already has role
          if (member.roles.cache.has(role.id)) {
            stats.skipped++;
            continue;
          }
          await member.roles.add(role);
          stats.success++;
        } else {
          // Check if has role to remove
          if (!member.roles.cache.has(role.id)) {
            stats.skipped++;
            continue;
          }
          await member.roles.remove(role);
          stats.success++;
        }

        // Rate limit protection - wait 1 second every 10 members
        if (stats.total % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        stats.failed++;
        stats.errors.push({
          user: member.user.tag,
          error: error.message,
        });
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Final result embed
    const resultEmbed = new EmbedBuilder()
      .setColor(
        stats.failed > 0 ? config.colors.warning : config.colors.success
      )
      .setTitle("✅ Bulk Role Completed")
      .setDescription(
        `Successfully ${action === "add" ? "added" : "removed"} ${role} ${
          action === "add" ? "to" : "from"
        } members.`
      )
      .addFields(
        {
          name: "📊 Statistics",
          value: `**Total Processed:** ${stats.total} members\n**✅ Success:** ${stats.success}\n**⏭️ Skipped:** ${stats.skipped}\n**❌ Failed:** ${stats.failed}`,
          inline: false,
        },
        { name: "⏱️ Duration", value: `${duration} seconds`, inline: true },
        { name: "👤 Executed By", value: `${interaction.user}`, inline: true }
      )
      .setTimestamp();

    // Add error details if any
    if (stats.errors.length > 0) {
      const errorList = stats.errors
        .slice(0, 10)
        .map((e) => `• ${e.user}: ${e.error}`)
        .join("\n");
      const remaining =
        stats.errors.length > 10
          ? `\n...and ${stats.errors.length - 10} more errors`
          : "";
      resultEmbed.addFields({
        name: "⚠️ Errors",
        value: `\`\`\`${errorList}${remaining}\`\`\``,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [resultEmbed] });

    // Send to log channel
    const settings = await import("../../utils/getsettings.js");
    const guildSettings = await settings.default(interaction.guild.id);

    if (guildSettings.logChannel) {
      const logChannel = interaction.guild.channels.cache.get(
        guildSettings.logChannel
      );
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(config.colors.info)
          .setTitle("📋 Bulk Role Executed")
          .addFields(
            {
              name: "Action",
              value: action === "add" ? "➕ Add Role" : "➖ Remove Role",
              inline: true,
            },
            { name: "Role", value: `${role}`, inline: true },
            { name: "Executed By", value: `${interaction.user}`, inline: true },
            {
              name: "Success Rate",
              value: `${stats.success}/${stats.total} (${(
                (stats.success / stats.total) *
                100
              ).toFixed(1)}%)`,
              inline: true,
            },
            { name: "Failed", value: `${stats.failed}`, inline: true },
            { name: "Duration", value: `${duration}s`, inline: true }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  },
};
