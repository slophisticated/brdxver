import {
  EmbedBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import Transaction from "../database/models/Transaction.js";
import config from "../config/config.js";
import getSettings from "./getsettings.js";

export default async function handleSelectMenu(interaction) {
  const { customId, values, users } = interaction;

  if (customId === "mm_select_partner") {
    const partner = users.first();

    if (partner.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ You cannot create a ticket with yourself!",
        ephemeral: true,
      });
    }

    if (partner.bot) {
      return interaction.reply({
        content: "❌ You cannot create a ticket with a bot!",
        ephemeral: true,
      });
    }

    // Create modal for price range and item description
    const modal = new ModalBuilder()
      .setCustomId(`mm_details_${partner.id}`)
      .setTitle("Middleman Ticket - Transaction Details");

    const priceInput = new TextInputBuilder()
      .setCustomId("price_amount")
      .setLabel("Transaction Amount (Rp)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("e.g., 150000")
      .setRequired(true);

    const itemInput = new TextInputBuilder()
      .setCustomId("item_description")
      .setLabel("Item/Service Description")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Describe what is being traded...")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(priceInput),
      new ActionRowBuilder().addComponents(itemInput)
    );

    await interaction.showModal(modal);
  }
}

// Handle modal submit
export async function handleModalSubmit(interaction) {
  if (!interaction.customId.startsWith("mm_details_")) return;

  await interaction.deferReply({ ephemeral: true });

  const partnerId = interaction.customId.replace("mm_details_", "");

  const priceAmount = parseInt(
    interaction.fields.getTextInputValue("price_amount").replace(/\D/g, "")
  );
  const itemDescription =
    interaction.fields.getTextInputValue("item_description");

  if (isNaN(priceAmount) || priceAmount <= 0) {
    return interaction.editReply({ content: "❌ Invalid price amount!" });
  }

  // Calculate fee based on price
  let fee = 0;
  let priceRangeLabel = "";

  if (priceAmount < 10000) {
    fee = 1000;
    priceRangeLabel = "< Rp 10.000";
  } else if (priceAmount >= 10000 && priceAmount <= 50000) {
    fee = 2000;
    priceRangeLabel = "Rp 10.000 - Rp 50.000";
  } else if (priceAmount >= 50001 && priceAmount <= 100000) {
    fee = 5000;
    priceRangeLabel = "Rp 50.001 - Rp 100.000";
  } else if (priceAmount >= 100001 && priceAmount <= 200000) {
    fee = 8000;
    priceRangeLabel = "Rp 100.001 - Rp 200.000";
  } else if (priceAmount >= 200001 && priceAmount <= 299999) {
    fee = 12000;
    priceRangeLabel = "Rp 200.001 - Rp 299.999";
  } else if (priceAmount >= 300000) {
    fee = Math.floor(priceAmount * 0.05);
    priceRangeLabel = "≥ Rp 300.000 (5%)";
  }

  try {
    const partner = await interaction.guild.members.fetch(partnerId);

    // Generate transaction ID
    const transactionId = `MM-${Date.now().toString().slice(-6)}`;

    // Get settings for MM channel
    const settings = await getSettings(interaction.guild.id);

    if (!settings.mmChannel) {
      return interaction.editReply({
        content:
          "❌ MM channel not configured! Please ask admin to run `/setup`",
      });
    }

    // Create thread
    const mmChannel = interaction.guild.channels.cache.get(settings.mmChannel);

    if (!mmChannel) {
      return interaction.editReply({
        content:
          "❌ MM channel not found! Please ask admin to run `/setup` again",
      });
    }

    const thread = await mmChannel.threads.create({
      name: `${transactionId}-${interaction.user.username}-${partner.user.username}`,
      type: ChannelType.PrivateThread,
      reason: `Middleman ticket by ${interaction.user.tag}`,
      autoArchiveDuration: 1440, // Auto archive after 24 hours of inactivity
      invitable: false, // Prevent members from inviting others
    });

    // Add members to thread (wrapped in try-catch karena kadang API error)
    try {
      await thread.members.add(interaction.user.id);
      await thread.members.add(partner.id);

      // Add all members with middleman role
      const middlemanRole = interaction.guild.roles.cache.get(
        config.roles.middleman
      );
      if (middlemanRole) {
        const middlemen = middlemanRole.members;
        for (const [id, member] of middlemen) {
          try {
            await thread.members.add(id);
          } catch (err) {
            console.log(
              `Could not add ${member.user.tag} to thread (will auto-join on mention)`
            );
          }
        }
      }
    } catch (error) {
      console.log(
        "Could not add members directly, they will auto-join when mentioned"
      );
    }

    // Unarchive thread to make sure it's visible
    if (thread.archived) {
      await thread.setArchived(false);
    }

    // Create transaction in database
    await Transaction.create({
      transactionId,
      buyer: {
        userId: interaction.user.id,
        username: interaction.user.tag,
      },
      seller: {
        userId: partner.id,
        username: partner.user.tag,
      },
      middleman: {
        userId: null,
        username: "Waiting...",
      },
      priceRange: priceRangeLabel,
      fee: fee,
      threadId: thread.id,
      status: "active",
    });

    // Create embed for thread
    const embed = new EmbedBuilder()
      .setColor(config.colors.purple)
      .setTitle("🤝 Middleman Transaction")
      .setDescription("A middleman will assist with this transaction.")
      .addFields(
        {
          name: "🆔 Transaction ID",
          value: `\`${transactionId}\``,
          inline: true,
        },
        {
          name: "💰 Amount",
          value: `Rp ${priceAmount.toLocaleString("id-ID")}`,
          inline: true,
        },
        {
          name: "💵 Fee",
          value: `Rp ${fee.toLocaleString("id-ID")}`,
          inline: true,
        },
        { name: "👤 Buyer", value: `${interaction.user}`, inline: true },
        { name: "👤 Seller", value: `${partner}`, inline: true },
        {
          name: "🛡️ Middleman",
          value: "<@&" + config.roles.middleman + ">",
          inline: true,
        },
        { name: "📦 Item/Service", value: itemDescription, inline: false },
        {
          name: "⚠️ Transaction Flow",
          value:
            "**1.** Buyer pays to provided payment method\n**2.** Buyer uploads payment proof\n**3.** Middleman verifies payment\n**4.** Seller delivers item/service\n**5.** Middleman completes transaction",
          inline: false,
        }
      )
      .setTimestamp();

    const controlButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mm_complete_${transactionId}`)
        .setLabel("✔️ Complete Transaction")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅"),
      new ButtonBuilder()
        .setCustomId(`mm_close_${transactionId}`)
        .setLabel("❌ Close Ticket")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒")
    );

    // Payment methods embed
    const paymentMethodsEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle("💳 Metode Pembayaran")
      .setDescription("Silakan gunakan salah satu metode pembayaran berikut:")
      .addFields(
        {
          name: "📱 QRIS",
          value: "Scan kode QR di bawah ini",
          inline: false,
        },
        {
          name: "Untuk Transaksi Selain Qris",
          value: "Boleh ditanyakan langsung ke middleman yang bertugas",
          inline: false,
        }
      )
      .setImage("https://i.imgur.com/6EIDOLf.png") // Ganti dengan QRIS image URL lu
      .setFooter({ text: "Pastikan transfer sesuai jumlah yang tertera" })
      .setTimestamp();

    // Payment panel embed (simplified - no buttons)
    const paymentProofEmbed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle("📤 Payment Proof")
      .setDescription(
        `**${interaction.user}**, silakan upload bukti transfer di thread ini setelah melakukan pembayaran.`
      )
      .addFields(
        {
          name: "💰 Total Pembayaran",
          value: `**Rp ${(priceAmount + fee).toLocaleString(
            "id-ID"
          )}**\n(Amount: Rp ${priceAmount.toLocaleString(
            "id-ID"
          )} + Fee: Rp ${fee.toLocaleString("id-ID")})`,
          inline: false,
        },
        {
          name: "⚠️ Penting",
          value:
            "• Pastikan bukti transfer jelas dan terbaca\n• Sertakan Transaction ID jika memungkinkan\n• Tunggu verifikasi dari middleman sebelum seller mengirim item",
          inline: false,
        }
      )
      .setFooter({
        text: "Upload screenshot bukti transfer langsung di thread ini",
      })
      .setTimestamp();

    // Send messages to thread in order
    // 1. Tag users paling atas
    await thread.send({
      content: `${interaction.user} ${partner} <@&${config.roles.middleman}>`,
    });

    // 2. Transaction details embed
    await thread.send({ embeds: [embed] });

    // 3. Middleman controls
    await thread.send({
      content: "**🛡️ Middleman Controls:**",
      components: [controlButtons],
    });

    // 4. Payment methods
    await thread.send({ embeds: [paymentMethodsEmbed] });

    // 5. Payment proof panel (no buttons)
    await thread.send({ embeds: [paymentProofEmbed] });

    await interaction.editReply({
      content: `✅ Ticket created! ${thread}`,
    });

    // No log here - will be sent when ticket is closed
  } catch (error) {
    console.error("Error creating MM ticket:", error);
    await interaction.editReply({
      content: "❌ Failed to create ticket. Please try again!",
    });
  }
}
