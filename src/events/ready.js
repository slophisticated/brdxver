import { ActivityType } from "discord.js";

export default {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`🚀 Bot is online as ${client.user.tag}`);
    client.user.setPresence({
      activities: [
        { name: "Whitelist & MM System", type: ActivityType.Watching },
      ],
      status: "online",
    });
  },
};
