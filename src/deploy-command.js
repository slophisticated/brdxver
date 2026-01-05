import { REST, Routes } from "discord.js";
import config from "./config/config.js";
import { readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];

// Load all commands
const commandFolders = readdirSync(join(__dirname, "commands"));

for (const folder of commandFolders) {
  const commandFiles = readdirSync(join(__dirname, "commands", folder)).filter(
    (file) => file.endsWith(".js")
  );

  for (const file of commandFiles) {
    try {
      const command = await import(`./commands/${folder}/${file}`);

      if (!command.default || !command.default.data) {
        console.log(`⚠️  Skipped: ${file} (invalid structure)`);
        continue;
      }

      commands.push(command.default.data.toJSON());
      console.log(`✅ Loaded: ${command.default.data.name}`);
    } catch (error) {
      console.error(`❌ Error loading ${file}:`, error.message);
    }
  }
}

const rest = new REST().setToken(config.token);

try {
  console.log(
    `🔄 Started refreshing ${commands.length} application (/) commands.`
  );

  const data = await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands }
  );

  console.log(
    `✅ Successfully reloaded ${data.length} application (/) commands.`
  );
} catch (error) {
  console.error("❌ Error deploying commands:", error);
}
