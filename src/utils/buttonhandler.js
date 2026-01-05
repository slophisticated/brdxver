import {
  EmbedBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import Transaction from "../database/models/Transaction.js";
import config from "../config/config.js";
import getSettings from "./getsettings.js";

export default async function handleButton(interaction) {
  const { customId } = interaction;

  if (customId.startsWith("mm_upload_proof_")) {
    const transactionId = customId.replace("mm_upload_proof_", "");
    await handleUploadProof(interaction, transactionId);
  } else if (customId.startsWith("mm_proof_uploaded_")) {
    const transactionId = customId.replace("mm_proof_uploaded_", "");
    await handleProofUploaded(interaction, transactionId);
  } else if (customId.startsWith("mm_complete_")) {
    // Check if user has middleman role (owner bypass)
    if (
      interaction.user.id !== config.ownerId &&
      !interaction.member.roles.cache.has(config.roles.middleman) &&
      !interaction.member.roles.cache.has(config.roles.admin)
    ) {
      return interaction.reply({
        content: "❌ Only middleman or admin can use this button!",
        ephemeral: true,
      });
    }
    const transactionId = customId.replace("mm_complete_", "");
    await handleComplete(interaction, transactionId);
  } else if (customId.startsWith("mm_close_")) {
    // Check if user has middleman role (owner bypass)
    if (
      interaction.user.id !== config.ownerId &&
      !interaction.member.roles.cache.has(config.roles.middleman) &&
      !interaction.member.roles.cache.has(config.roles.admin)
    ) {
      return interaction.reply({
        content: "❌ Only middleman or admin can use this button!",
        ephemeral: true,
      });
    }
    const transactionId = customId.replace("mm_close_", "");
    await handleClose(interaction, transactionId);
  }
}

async function handleUploadProof(interaction, transactionId) {
  const modal = new ModalBuilder()
    .setCustomId(`mm_proof_modal_${transactionId}`)
    .setTitle("Upload Payment Proof");

  const proofInput = new TextInputBuilder()
    .setCustomId("proof_link")
    .setLabel("Payment Proof Link (Image URL)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("https://imgur.com/xxx or paste image link")
    .setRequired(true);

  const notesInput = new TextInputBuilder()
    .setCustomId("proof_notes")
    .setLabel("Additional Notes (Optional)")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Any additional information...")
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(proofInput),
    new ActionRowBuilder().addComponents(notesInput)
  );

  await interaction.showModal(modal);
}

async function handleProofUploaded(interaction, transactionId) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle("✅ Payment Proof Uploaded")
    .setDescription(
      `${interaction.user} has marked payment proof as uploaded.\n\nMiddleman will verify shortly.`
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleComplete(interaction, transactionId) {
  await interaction.deferReply();

  try {
    const transaction = await Transaction.findOne({
      transactionId,
      status: "active",
    });

    if (!transaction) {
      return interaction.editReply({
        content: "❌ Transaction not found or already completed!",
      });
    }

    // Update transaction status
    transaction.status = "completed";
    transaction.completedAt = new Date();
    transaction.middleman = {
      userId: interaction.user.id,
      username: interaction.user.tag,
    };
    await transaction.save();

    // Fetch transcript from thread
    const thread = interaction.channel;
    const messages = await thread.messages.fetch({ limit: 100 });

    // Build transcript
    let transcript = `═══════════════════════════════════════\n`;
    transcript += `TRANSACTION TRANSCRIPT - ${transactionId}\n`;
    transcript += `Completed: ${new Date().toLocaleString("id-ID")}\n`;
    transcript += `═══════════════════════════════════════\n\n`;

    // Sort messages oldest to newest
    const sortedMessages = Array.from(messages.values()).reverse();

    sortedMessages.forEach((msg) => {
      const timestamp = msg.createdAt.toLocaleString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
      transcript += `[${timestamp}] ${msg.author.tag}:\n`;

      if (msg.content) {
        transcript += `${msg.content}\n`;
      }

      if (msg.embeds.length > 0) {
        transcript += `[Embed: ${msg.embeds[0].title || "Untitled"}]\n`;
      }

      if (msg.attachments.size > 0) {
        msg.attachments.forEach((att) => {
          transcript += `[Attachment: ${att.url}]\n`;
        });
      }

      transcript += `\n`;
    });

    // Create completion embed
    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle("✅ Transaction Completed")
      .setDescription("This transaction has been successfully completed!")
      .addFields(
        {
          name: "🆔 Transaction ID",
          value: `\`${transactionId}\``,
          inline: true,
        },
        { name: "🛡️ Completed By", value: `${interaction.user}`, inline: true },
        {
          name: "📅 Completed At",
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Lock and archive thread
    await thread.setLocked(true);
    await thread.setArchived(true);

    // Send DM to buyer and seller
    try {
      const buyer = await interaction.client.users.fetch(
        transaction.buyer.userId
      );
      const seller = await interaction.client.users.fetch(
        transaction.seller.userId
      );

      const dmEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle("✅ Transaction Completed")
        .setDescription(
          `Your transaction \`${transactionId}\` has been completed successfully!`
        )
        .addFields(
          { name: "Completed By", value: interaction.user.tag, inline: true },
          {
            name: "Date",
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true,
          }
        );

      await buyer.send({ embeds: [dmEmbed] }).catch(() => {});
      await seller.send({ embeds: [dmEmbed] }).catch(() => {});
    } catch (error) {
      console.error("Error sending DM:", error);
    }

    // Log with transcript
    const settings = await getSettings(interaction.guild.id);
    if (settings.logChannel) {
      const logChannel = interaction.guild.channels.cache.get(
        settings.logChannel
      );
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle("✅ MM Transaction Completed")
          .addFields(
            { name: "Transaction ID", value: transactionId, inline: true },
            { name: "Buyer", value: transaction.buyer.username, inline: true },
            {
              name: "Seller",
              value: transaction.seller.username,
              inline: true,
            },
            { name: "Middleman", value: `${interaction.user}`, inline: true },
            { name: "Status", value: "✅ Completed", inline: true },
            {
              name: "Completed At",
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: true,
            }
          )
          .setTimestamp();

        // Send transcript as file
        const buffer = Buffer.from(transcript, "utf-8");
        const attachment = {
          attachment: buffer,
          name: `transcript-${transactionId}.txt`,
        };

        await logChannel.send({
          embeds: [logEmbed],
          files: [attachment],
        });
      }
    }
  } catch (error) {
    console.error("Error completing transaction:", error);
    await interaction.editReply({
      content: "❌ An error occurred while completing the transaction!",
    });
  }
}

async function handleClose(interaction, transactionId) {
  await interaction.deferReply();

  try {
    const transaction = await Transaction.findOne({
      transactionId,
      status: "active",
    });

    if (!transaction) {
      return interaction.editReply({ content: "❌ Transaction not found!" });
    }

    // Update transaction status
    transaction.status = "cancelled";
    await transaction.save();

    const embed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle("❌ Ticket Closed")
      .setDescription("This ticket has been closed.")
      .addFields(
        {
          name: "🆔 Transaction ID",
          value: `\`${transactionId}\``,
          inline: true,
        },
        { name: "👮 Closed By", value: `${interaction.user}`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Lock and archive thread
    const thread = interaction.channel;
    await thread.setLocked(true);
    await thread.setArchived(true);

    // Log
    const settings = await getSettings(interaction.guild.id);
    if (settings.logChannel) {
      const logChannel = interaction.guild.channels.cache.get(
        settings.logChannel
      );
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle("❌ MM Ticket Closed")
          .addFields(
            { name: "Transaction ID", value: transactionId, inline: true },
            { name: "Closed By", value: `${interaction.user}`, inline: true }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (error) {
    console.error("Error closing ticket:", error);
    await interaction.editReply({
      content: "❌ An error occurred while closing the ticket!",
    });
  }
}
