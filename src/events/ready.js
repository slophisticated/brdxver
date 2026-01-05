import { ActivityType } from "discord.js";

export default {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`🚀 Bot is online as ${client.user.tag}`);

    // Update pertama saat bot nyala
    const guild = client.guilds.cache.get("ID_SERVER_KAMU");
    if (guild) {
      client.user.setPresence({
        activities: [
          {
            name: `${guild.memberCount} Members`,
            type: ActivityType.Watching,
          },
        ],
        status: "online",
      });
    }

    // Update berkala tiap 10 menit
    setInterval(() => {
      const guild = client.guilds.cache.get("1422567690362683507");
      if (!guild) return;

      client.user.setPresence({
        activities: [
          {
            name: `${guild.memberCount} Members`,
            type: ActivityType.Watching,
          },
        ],
        status: "online",
      });
    }, 600000);
  },
};
