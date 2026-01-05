import { EmbedBuilder } from "discord.js";
import config from "../config/config.js";

export default {
  name: "interactionCreate",
  async execute(interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error("Error executing command:", error);

        const errorMessage = {
          content: "❌ An error occurred while executing this command!",
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }

    // Handle button interactions
    if (interaction.isButton()) {
      const { customId } = interaction;

      // Import button handler
      const buttonHandler = await import("../utils/buttonhandler.js");
      await buttonHandler.default(interaction);
    }

    // Handle select menu interactions (string & user select)
    if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) {
      const selectHandler = await import("../utils/selectmenuhandler.js");
      await selectHandler.default(interaction);
    }

    // Handle modal submit
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("mm_proof_modal_")) {
        const transactionId = interaction.customId.replace(
          "mm_proof_modal_",
          ""
        );
        const proofLink = interaction.fields.getTextInputValue("proof_link");
        const notes =
          interaction.fields.getTextInputValue("proof_notes") ||
          "No additional notes";

        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle("💳 Payment Proof Submitted")
          .setDescription(`${interaction.user} has submitted payment proof.`)
          .addFields(
            { name: "🔗 Proof Link", value: proofLink, inline: false },
            { name: "📝 Notes", value: notes, inline: false }
          )
          .setFooter({ text: `Transaction ID: ${transactionId}` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } else {
        const { handleModalSubmit } = await import(
          "../utils/selectmenuhandler.js"
        );
        await handleModalSubmit(interaction);
      }
    }
  },
};
