import { SlashCommandBuilder, EmbedBuilder, REST, Routes } from "discord.js";
import config from "../../config/config.js";
import { readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  data: new SlashCommandBuilder()
    .setName("refresh")
    .setDescription("Refresh and deploy all slash commands")
    .setDefaultMemberPermissions(0), // Admin only

  async execute(interaction) {
    // Check if user has admin role
    if (
      !interaction.member.roles.cache.has(config.roles.admin) &&
      !interaction.member.permissions.has("Administrator")
    ) {
      return interaction.reply({
        content: "❌ Only admins can use this command!",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const commands = [];

      // Load all commands
      const commandFolders = readdirSync(join(__dirname, ".."));

      for (const folder of commandFolders) {
        const folderPath = join(__dirname, "..", folder);

        // Skip if not a directory
        try {
          const commandFiles = readdirSync(folderPath).filter((file) =>
            file.endsWith(".js")
          );

          for (const file of commandFiles) {
            const command = await import(
              `../${folder}/${file}?update=${Date.now()}`
            );
            commands.push(command.default.data.toJSON());
          }
        } catch (error) {
          // Skip if folder doesn't exist or has no files
          continue;
        }
      }

      const rest = new REST().setToken(config.token);

      // Deploy commands
      const data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle("✅ Commands Refreshed")
        .setDescription(
          `Successfully refreshed **${data.length}** slash commands!`
        )
        .addFields({
          name: "📝 Commands",
          value: data.map((cmd) => `\`/${cmd.name}\``).join(", "),
          inline: false,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      console.log(`✅ Commands refreshed by ${interaction.user.tag}`);
    } catch (error) {
      console.error("Error refreshing commands:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle("❌ Refresh Failed")
        .setDescription("An error occurred while refreshing commands.")
        .addFields({
          name: "Error",
          value: `\`\`\`${error.message}\`\`\``,
          inline: false,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
