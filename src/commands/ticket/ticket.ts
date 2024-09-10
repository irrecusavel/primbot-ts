import { ActionRowBuilder, ApplicationCommandType, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { Command } from "../../types/CommandsType";

export default new Command({
    name: "ticket",
    description: "Use to send the ticket panel.",
    type: ApplicationCommandType.ChatInput,

    run({ interaction, client }) {
        const embed = new EmbedBuilder()
        .setColor("#bc3bcc")
        .setAuthor({ name: "Fxsh Ticket's", iconURL: "https://i.imgur.com/qDBAsFb.png" })
        .setTitle("Bem-vindo(a) ao Sistema de Ticket's da Fxsh")
        .setThumbnail(interaction.guild?.iconURL() ?? null)
        .setDescription("Para abrir um ticket, escolha abaixo a categoria que melhor se adequa à sua questão:")
        .setFooter({ text: "O uso inadequado desta ferramenta pode resultar em punições, utilize com responsabilidade."});

        const select = new StringSelectMenuBuilder()
        .setCustomId("ticketMenu")
        .setPlaceholder("Selecione uma opção.")
        .setOptions(
            {
                emoji: "🪙",
                label: "Financeiro",
                description: "Obtenha ajuda em questões financeiras relacionadas ao painel.",
                value: "financial-ticket"
            },
            {
                emoji: "❓",
                label: "Dúvida",
                description: "Tire suas dúvidas sobre as funcionalidades do painel.",
                value: "doubt-ticket"
            },
        )

        interaction.reply({
            content: "Mensagem enviada com êxito!",
            ephemeral: true
        })

        interaction.channel?.send({
            embeds: [embed],
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)]
        });
    },
});
