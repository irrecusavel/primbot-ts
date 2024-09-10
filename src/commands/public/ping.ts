import { ApplicationCommandType } from "discord.js";
import { Command } from "../../types/CommandsType";

export default new Command({
    name: "ping",
    description: "Check the bot's latency.",
    type: ApplicationCommandType.ChatInput,

    run({ interaction, client }) {
        const wsPing = client.ws.ping;

        interaction.reply({
            content: `**🏓 Pong!**\n**API:** \`\`${wsPing}ms\`\``,
            ephemeral: true
        });
    },
});
