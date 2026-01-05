import { ActivityType, Events } from "discord.js";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`🚀 Bot is online as ${client.user.tag}`);

    const guild = client.guilds.cache.get("ID_SERVER_KAMU");
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
