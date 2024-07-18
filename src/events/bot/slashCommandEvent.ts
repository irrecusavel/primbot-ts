import { CommandInteractionOptionResolver } from "discord.js";
import { client } from "../..";
import { EventStructs } from "../../types/EventsType";

export default new EventStructs({
  name: "interactionCreate",
  run(interaction) {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const options = interaction.options as CommandInteractionOptionResolver;
    command.run({ client, interaction, options });
  },
});