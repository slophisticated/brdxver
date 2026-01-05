import Settings from "../database/models/Settings.js";

export default async function getSettings(guildId) {
  const settings = await Settings.findOne({ guildId });

  if (!settings) {
    return {
      logChannel: null,
      mmChannel: null,
    };
  }

  return {
    logChannel: settings.logChannel,
    mmChannel: settings.mmChannel,
  };
}
