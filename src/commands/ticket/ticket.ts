import { ActionRowBuilder, ApplicationCommandType, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { Command } from "../../types/CommandsType";

export default new Command({
    name: "ticket",
    description: "Use to send the ticket panel.",
    type: ApplicationCommandType.ChatInput,

    run({ interaction, client }) {
        const embed = new EmbedBuilder()
        .setColor("#bc3bcc")
        .setAuthor({ name: "Fxsh Ticket's", iconURL: "https://media.discordapp.net/attachments/1110495236716773447/1164986107822346241/1116833686013362186.png?ex=66df375c&is=66dde5dc&hm=5d805dee4ac741b5bd41279d0cead74c9120d4755e931a7f78a5bc71283662fb&" })
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
