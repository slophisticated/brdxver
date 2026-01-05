import { Client, GatewayIntentBits, Collection } from "discord.js";
import config from "./config/config.js";
import connectDatabase from "./database/connect.js";
import { readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Collections
client.commands = new Collection();

// Load commands
async function loadCommands() {
  const commandFolders = readdirSync(join(__dirname, "commands"));

  for (const folder of commandFolders) {
    const commandFiles = readdirSync(
      join(__dirname, "commands", folder)
    ).filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const command = await import(`./commands/${folder}/${file}`);
      client.commands.set(command.default.data.name, command.default);
      console.log(`✅ Loaded command: ${command.default.data.name}`);
    }
  }
}

// Load events
async function loadEvents() {
  const eventFiles = readdirSync(join(__dirname, "events")).filter((file) =>
    file.endsWith(".js")
  );

  for (const file of eventFiles) {
    const event = await import(`./events/${file}`);

    if (event.default.once) {
      client.once(event.default.name, (...args) =>
        event.default.execute(...args)
      );
    } else {
      client.on(event.default.name, (...args) =>
        event.default.execute(...args)
      );
    }
    console.log(`✅ Loaded event: ${event.default.name}`);
  }
}

// Initialize bot
async function init() {
  try {
    await connectDatabase();
    await loadCommands();
    await loadEvents();
    await client.login(config.token);
  } catch (error) {
    console.error("❌ Error initializing bot:", error);
    process.exit(1);
  }
}

init();
