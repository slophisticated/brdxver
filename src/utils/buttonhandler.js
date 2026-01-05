import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import Transaction from "../database/models/Transaction.js";
import config from "../config/config.js";
import getSettings from "./getsettings.js";

/* ================= BUTTON HANDLER ================= */

export default async function handleButton(interaction) {
  const { customId } = interaction;

  if (customId.startsWith("mm_upload_proof_")) {
    const transactionId = customId.replace("mm_upload_proof_", "");
    return handleUploadProof(interaction, transactionId);
  }

  if (customId.startsWith("mm_proof_uploaded_")) {
    const transactionId = customId.replace("mm_proof_uploaded_", "");
    return handleProofUploaded(interaction, transactionId);
  }

  if (customId.startsWith("mm_complete_")) {
    if (!hasPermission(interaction)) {
      return interaction.reply({
        content: "❌ Only middleman or admin can use this button!",
        ephemeral: true,
      });
    }

    const transactionId = customId.replace("mm_complete_", "");
    return handleComplete(interaction, transactionId);
  }

  if (customId.startsWith("mm_close_")) {
    if (!hasPermission(interaction)) {
      return interaction.reply({
        content: "❌ Only middleman or admin can use this button!",
        ephemeral: true,
      });
    }

    const transactionId = customId.replace("mm_close_", "");
    return handleClose(interaction, transactionId);
  }
}

/* ================= PERMISSION ================= */

function hasPermission(interaction) {
  return (
    interaction.user.id === config.ownerId ||
    interaction.member.roles.cache.has(config.roles.middleman) ||
    interaction.member.roles.cache.has(config.roles.admin)
  );
}

/* ================= CLOSE TICKET ================= */

async function handleClose(interaction, transactionId) {
  await interaction.deferReply();

  try {
    const transaction = await Transaction.findOne({
      transactionId,
      status: "active",
    });

    if (!transaction) {
      return interaction.editReply({
        content: "❌ Transaction not found!",
      });
    }

    transaction.status = "cancelled";
    transaction.closedAt = new Date();
    await transaction.save();

    const thread = interaction.channel;

    /* ===== EMBED DI THREAD ===== */

    const closeEmbed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle("❌ Ticket Closed")
      .addFields(
        {
          name: "Transaction ID",
          value: transactionId,
          inline: true,
        },
        {
          name: "Closed By",
          value: `${interaction.user}`,
          inline: true,
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [closeEmbed] });

    await thread.setLocked(true);
    await thread.setArchived(true);

    /* ===== LOG CHANNEL ===== */

    const settings = await getSettings(interaction.guild.id);
    if (!settings.logChannel) return;

    const logChannel = interaction.guild.channels.cache.get(
      settings.logChannel
    );
    if (!logChannel) return;

    const logEmbed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle("📄 MM Ticket Closed")
      .addFields(
        {
          name: "Transaction ID",
          value: transaction.transactionId,
          inline: true,
        },
        {
          name: "Amount",
          value: `Rp ${transaction.priceRange}`,
          inline: true,
        },
        {
          name: "Fee",
          value: `Rp ${transaction.fee}`,
          inline: true,
        },
        {
          name: "Buyer",
          value: `<@${transaction.buyer.userId}>`,
          inline: true,
        },
        {
          name: "Seller",
          value: `<@${transaction.seller.userId}>`,
          inline: true,
        },
        {
          name: "Thread",
          value: `${thread}`,
          inline: true,
        }
      )
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Access Thread")
        .setStyle(ButtonStyle.Link)
        .setURL(thread.url)
    );

    await logChannel.send({
      embeds: [logEmbed],
      components: [actionRow],
    });
  } catch (error) {
    console.error("MM Close Error:", error);
    await interaction.editReply({
      content: "❌ Error while closing ticket",
    });
  }
}

/* ================= PLACEHOLDER ================= */
/* Function lain sengaja tidak diubah */
