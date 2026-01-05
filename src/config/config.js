import dotenv from "dotenv";
dotenv.config();

export default {
  token: process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  mongodbUri: process.env.MONGODB_URI,

  // Owner ID - bypass all permissions
  ownerId: process.env.OWNER_ID,

  roles: {
    middleman: process.env.MIDDLEMAN_ROLE_ID,
    loyalCustomer: process.env.LOYAL_CUSTOMER_ROLE_ID,
    admin: process.env.ADMIN_ROLE_ID,
    whitelistedCustomer: process.env.WHITELISTED_CUSTOMER_ROLE_ID, // x8 cust role
  },

  channels: {
    // Channels akan diset via command /setup
  },

  colors: {
    primary: 0x5865f2, // Discord Blurple
    success: 0x57f287, // Green
    error: 0xed4245, // Red
    warning: 0xfee75c, // Yellow
    purple: 0x9b59b6, // Purple (Luarmor style)
    info: 0x3498db, // Blue
  },

  priceRanges: [
    { label: "Rp 10.000 - Rp 50.000", value: "10000-50000", fee: 2000 },
    { label: "Rp 50.001 - Rp 100.000", value: "50001-100000", fee: 5000 },
    { label: "Rp 100.001 - Rp 200.000", value: "100001-200000", fee: 8000 },
    { label: "Rp 200.001 - Rp 299.999", value: "200001-299999", fee: 12000 },
    { label: "≥ Rp 300.000", value: "300000+", feePercent: 5 },
  ],

  loyalCustomerThreshold: 3, // Jumlah whitelist untuk dapat Loyal Customer role
};
