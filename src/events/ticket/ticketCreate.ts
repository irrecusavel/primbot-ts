import { EventStructs } from "../../types/EventsType";
import { ChannelType, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, VoiceChannel, GuildMember, Message, AuditLogEvent } from "discord.js";
import { JsonDatabase } from "wio.db";
import * as path from 'path';

const db = new JsonDatabase({
  databasePath: path.join(__dirname, '..', '..', 'database', 'ticket.json')
});

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID;
const TICKET_STAFF_ROLES = JSON.parse(process.env.TICKET_STAFF_ROLES || '[]');

async function getNextTicketNumber(): Promise<number> {
  const currentCount = await db.get("ticketCounter");
  const newCount = (typeof currentCount === 'number' ? currentCount : 0) + 1;
  await db.set("ticketCounter", newCount);
  return newCount;
}

async function sendLog(guild: any, embed: EmbedBuilder) {
  const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID) as TextChannel;
  if (logChannel) {
    await logChannel.send({ embeds: [embed] });
  }
}

export default new EventStructs({
  name: "interactionCreate",
  async run(interaction) {
    if (!interaction.isStringSelectMenu() && !interaction.isButton() && !interaction.isModalSubmit()) return;

    const ticketMenu = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("ticketMenu")
          .setPlaceholder("Selecione uma opção")
          .addOptions([
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
          ])
      );

    if (interaction.customId === "ticketMenu") {
      const guild = interaction.guild;
      if (!guild) return;

      const existingTicket = guild.channels.cache.find(
        channel => channel.name === `・${interaction.user.username}` && channel.type === ChannelType.GuildText
      );

      if (existingTicket) {
        const redirectButton = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Ir para o Ticket')
              .setStyle(ButtonStyle.Link)
              .setURL(existingTicket instanceof TextChannel ? existingTicket.url : '#')
          );

        await interaction.reply({
          content: `Você já tem um ticket aberto: ${existingTicket}.`,
          components: [redirectButton],
          ephemeral: true
        });

        if (interaction.message) {
          await interaction.message.edit({
            components: [ticketMenu]
          });
        }

        return;
      }

      const modal = new ModalBuilder()
        .setCustomId('ticketModal')
        .setTitle('Motivo do Ticket');

      const motivoInput = new TextInputBuilder()
        .setCustomId('reasonInput')
        .setLabel("Por que você está abrindo este ticket?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(motivoInput);

      modal.addComponents(firstActionRow);

      if (interaction.isStringSelectMenu()) {
        await interaction.showModal(modal);
        
        if (interaction.message) {
          await interaction.message.edit({
            components: [ticketMenu]
          });
        }
      } else {
        console.error('Interação inválida para exibir o modal');
      }
    }

    if (interaction.customId === 'ticketModal') {
      if (!interaction.isModalSubmit()) return;

      const motivo = interaction.fields.getTextInputValue('reasonInput');
      const guild = interaction.guild;
      if (!guild) return;

      const ticketNumber = await getNextTicketNumber();
      const ticketChannel = await guild.channels.create({
        name: `・${interaction.user.username}-${ticketNumber}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        topic: interaction.user.id,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: ["ViewChannel"],
          },
          {
            id: interaction.user.id,
            allow: ["ViewChannel", "SendMessages", "ReadMessageHistory", "AttachFiles", "EmbedLinks", "UseExternalEmojis", "UseExternalStickers"],
            deny: ["ManageChannels", "UseApplicationCommands", "SendPolls", "CreatePrivateThreads", "CreatePublicThreads", "CreateInstantInvite", "AddReactions", "MentionEveryone", "ManageThreads", "ManageWebhooks", "ManageNicknames", "ManageMessages", "UseExternalSounds", "UseEmbeddedActivities", "UseSoundboard"]
          },
          {
            id: TICKET_STAFF_ROLES[0],
            allow: ["ViewChannel", "SendMessages", "ReadMessageHistory", "ManageChannels"],
          },
          ...TICKET_STAFF_ROLES.slice(1).map((roleId: string) => ({
            id: roleId,
            allow: ["ViewChannel", "SendMessages", "ReadMessageHistory", "ManageChannels"],
          }))
        ],
      });

      const embed = new EmbedBuilder()
        .setAuthor({ name: `#${ticketNumber}` })
        .setThumbnail(interaction.user.avatarURL())
        .setTitle(`Ticket Criado!`)
        .setFields(
          { name: 'Aberto por:', value: `${interaction.user} \`\`(${interaction.user.id})\`\`` },
          { name: 'Motivo do Ticket:', value: `\`\`\`${motivo}\`\`\``}
        )
        .setDescription(`Seu ticket foi criado com sucesso!\nUm membro da equipe irá atendê-lo em breve.`)
        .setColor("#bc3bcc")
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Fechar Ticket")
        .setStyle(ButtonStyle.Danger);

      const callButton = new ButtonBuilder()
        .setCustomId("create_call")
        .setLabel("Canal de Voz")
        .setStyle(ButtonStyle.Success);

      const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(closeButton, callButton);

      await (ticketChannel as TextChannel).send({ embeds: [embed], components: [actionRow] });

      const redirectButton = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setLabel('・Ir para o ticket!')
            .setStyle(ButtonStyle.Link)
            .setURL(ticketChannel.url)
        );

      await interaction.reply({ content: `> Seu ticket #${ticketNumber} foi criado:`, components: [redirectButton], ephemeral: true });

      const logEmbed = new EmbedBuilder()
      .setAuthor({ name: `#${ticketNumber}`})
      .setTitle("Ticket Criado!")
      .setThumbnail(interaction.user.avatarURL())
      .setFields(
        { name: "Aberto por:", value: `${interaction.user} \`\`(${interaction.user.id})\`\``},
        { name: "Canal:", value: `${ticketChannel} \`\`(${ticketChannel.id})\`\``},
        { name: "Motivo do Ticket:", value: `\`\`\`${motivo}\`\`\``},
      )
      .setTimestamp()
      .setColor("Green");

      await sendLog(guild, logEmbed);
    }

    if (interaction.customId === "create_call" && interaction.isButton()) {
      const guild = interaction.guild;
      if (!guild) return;

      const member = interaction.member as GuildMember;
      if (!TICKET_STAFF_ROLES.some((roleId: string) => member.roles.cache.has(roleId))) {
        await interaction.reply({ content: "> Você não tem permissão para criar uma call.", ephemeral: true });
        return;
      }

      const ticketChannel = interaction.channel as TextChannel;
      const ticketNumber = ticketChannel.name.split('-').pop();
      const existingCall = guild.channels.cache.find(
        channel => channel.name === `・${interaction.user.username}-${ticketNumber}` && channel.type === ChannelType.GuildVoice
      );

      if (existingCall) {
        const confirmEmbed = new EmbedBuilder()
          .setTitle("Call Existente!")
          .setDescription("Já existe uma call para este ticket. Deseja apagá-la?")
          .setColor("#bc3bcc");

        const confirmButton = new ButtonBuilder()
          .setCustomId("confirm_delete_call")
          .setLabel("Sim, apagar")
          .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
          .setCustomId("cancel_delete_call")
          .setLabel("Não, manter")
          .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(confirmButton, cancelButton);

        await interaction.reply({ embeds: [confirmEmbed], components: [actionRow], ephemeral: true });
      } else {
        const userIdTopic = ticketChannel.topic;
        const voiceChannel = await guild.channels.create({
          name: `・${interaction.user.username}-${ticketNumber}`,
          type: ChannelType.GuildVoice,
          parent: ticketChannel.parentId,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: ["ViewChannel"],
            },
            {
              id: userIdTopic ?? guild.id,
              allow: ["ViewChannel", "Connect", "Speak", "Stream"],
              deny: ["ManageChannels", "UseSoundboard", "SendPolls", "SendVoiceMessages"]
            },
            {
              id: TICKET_STAFF_ROLES[0],
              allow: ["ViewChannel", "Connect", "Speak", "Stream", "ManageChannels"],
            },
            ...TICKET_STAFF_ROLES.slice(1).map((roleId: string) => ({
              id: roleId,
              allow: ["ViewChannel", "Connect", "Speak", "Stream", "ManageChannels"],
            }))
          ],
        });

        const joinCallButton = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setLabel('・Entrar na Call')
              .setStyle(ButtonStyle.Link)
              .setURL(`https://discord.com/channels/${guild.id}/${voiceChannel.id}`)
          );

        await interaction.reply({ content: `> Call criada com sucesso:`, components: [joinCallButton] });

        const ticketCreator = await guild.members.fetch(userIdTopic ?? '');
        const logEmbed = new EmbedBuilder()
        .setAuthor({ name: `#${ticketNumber}`})
        .setTitle("Call Criada!")
        .setThumbnail(interaction.user.avatarURL())
        .setFields(
          { name: "Call criada por:", value: `${interaction.user} \`\`(${interaction.user.id})\`\``}, 
          { name: "Canal", value: `${voiceChannel} \`\`(${voiceChannel.id})\`\``},
          { name: "Ticket Aberto por:", value: `${ticketCreator} \`\`(${ticketCreator.id})\`\``}
        )
        .setTimestamp()
        .setColor("Green")

        await sendLog(guild, logEmbed);

        let inactivityTimer: NodeJS.Timeout | null = null;

        const checkInactivity = () => {
          if (voiceChannel.members.size === 0) {
            if (!inactivityTimer) {
              inactivityTimer = setTimeout(async () => {
                try {
                  const updatedChannel = await guild.channels.fetch(voiceChannel.id);
                  if (updatedChannel) {
                    await updatedChannel.delete();
                    await ticketChannel.send("## Inatividade!\n-# A call foi apagada pois ficou 3 minutos inativa sem ninguém.");

                    const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: `#${ticketNumber}`})
                    .setTitle("Call Apagada por Inatividade!")
                    .setFields(
                      { name: "Motivo:", value: `\`\`\`A call foi apagada após 3 minutos de inatividade.\`\`\``},
                      { name: "Call:", value: `${voiceChannel.name} \`\`(${voiceChannel.id})\`\``}, 
                      { name: "Ticket Aberto por:", value: `${ticketCreator} \`\`(${ticketCreator.id})\`\``}
                    )
                    .setTimestamp()
                    .setColor("Orange");

                    await sendLog(guild, logEmbed);
                  }
                } catch (error) {
                  console.error(`Erro ao deletar o canal de voz: ${error}`);
                }
              }, 3 * 60 * 1000);
            }
          } else {
            if (inactivityTimer) {
              clearTimeout(inactivityTimer);
              inactivityTimer = null;
            }
          }
        };

        interaction.client.on('voiceStateUpdate', (oldState, newState) => {
            if (oldState.channelId === voiceChannel.id || newState.channelId === voiceChannel.id) {
                checkInactivity();
            }
        });
        checkInactivity();
      }
    }

    if (interaction.customId === "confirm_delete_call" && interaction.isButton()) {
      const guild = interaction.guild;
      if (!guild) return;

      const member = interaction.member as GuildMember;
      if (!TICKET_STAFF_ROLES.some((roleId: string) => member.roles.cache.has(roleId))) {
        await interaction.reply({ content: "> Você não tem permissão para apagar a call.", ephemeral: true });
        return;
      }

      const ticketChannel = interaction.channel as TextChannel;
      const ticketNumber = ticketChannel.name.split('-').pop();
      const existingCall = guild.channels.cache.find(
        channel => channel.name === `・${interaction.user.username}-${ticketNumber}` && channel.type === ChannelType.GuildVoice
      ) as VoiceChannel;

      if (existingCall) {
        try {
          await existingCall.delete();
          await interaction.reply({ content: "> A call foi apagada.", ephemeral: true });

          const ticketCreator = await guild.members.fetch(ticketChannel.topic ?? '');
          const logEmbed = new EmbedBuilder()
          .setAuthor({ name: `#${ticketNumber}`})
          .setTitle("Call Apagada Manualmente!")
          .setThumbnail(interaction.user.avatarURL())
          .setFields(
            { name: "Apagada por:", value: `${interaction.user} \`\`(${interaction.user.id})\`\``},
            { name: "Call:", value: `${existingCall.name} \`\`(${existingCall.id})\`\`` },
            { name: "Ticket Aberto por:", value: `${ticketCreator} \`\`(${ticketCreator.id})\`\``}
          )
          .setTimestamp()
          .setColor("Red")

          await sendLog(guild, logEmbed);
        } catch (error) {
          console.error(`Erro ao deletar o canal de voz: ${error}`);
          await interaction.reply({ content: "> Ocorreu um erro ao tentar apagar a call.", ephemeral: true });
        }
      } else {
        await interaction.reply({ content: "> A call não foi encontrada.", ephemeral: true });
      }
    }

    if (interaction.customId === "cancel_delete_call" && interaction.isButton()) {
      await interaction.reply({ content: "> A ação foi cancelada. A call será mantida.", ephemeral: true });
    }

    if (interaction.customId === "close_ticket" && interaction.isButton()) {
      const guild = interaction.guild;
      if (!guild) return;

      const member = interaction.member as GuildMember;
      if (!TICKET_STAFF_ROLES.some((roleId: string) => member.roles.cache.has(roleId))) {
        await interaction.reply({ content: "> Você não tem permissão para fechar o ticket.", ephemeral: true });
        return;
      }

      const channel = interaction.channel as TextChannel;
      const ticketNumber = channel.name.split('-').pop();

      const embed = new EmbedBuilder()
        .setAuthor({ name: `#${ticketNumber}`})
        .setTitle(`Ticket Fechado!`)
        .setDescription(`Seu ticket foi fechado.`)
        .setTimestamp()
        .setColor("Red");

      await interaction.reply({ content: "> O ticket será fechado em breve.", ephemeral: true });
      
      await channel.send({ embeds: [embed] });

      const relatedCall = guild.channels.cache.find(
        ch => ch.name === channel.name && ch.type === ChannelType.GuildVoice
      ) as VoiceChannel;

      let voiceMembers = 'N/A';
      if (relatedCall) {
        voiceMembers = relatedCall.members.size > 0 ? 
          relatedCall.members.map(member => `${member.user.tag}`).join(', ') : 
          'N/A';
        try {
          await relatedCall.delete();
        } catch (error) {
          console.error(`Erro ao deletar o canal de voz: ${error}`);
        }
      }

      const messages = await channel.messages.fetch({ limit: 35 });
      const participants = new Set<string>();
      let ticketCreator = 'Não identificado';
      
      const creatorId = channel.topic;
      
      if (creatorId) {
        try {
          const creatorMember = await guild.members.fetch(creatorId);
          ticketCreator = `${creatorMember.user.tag} \`\`(${creatorId})\`\``;
        } catch (error) {
          console.error(`Erro ao buscar o criador do ticket: ${error}`);
          ticketCreator = `Não encontrado \`\`(${creatorId})\`\``;
        }
      }

      messages.forEach(message => {
        if (message.author.bot || message.embeds.length > 0) return;
        participants.add(`${message.author.tag}`);
      });

      const participantsString = participants.size > 0 ? Array.from(participants).join(', ') : 'Nenhum participante';
      const logEmbed = new EmbedBuilder()
      .setAuthor({ name: `#${ticketNumber}`})
      .setTitle("Ticket Fechado!")
      .setThumbnail(interaction.user.avatarURL())
      .setFields(
        { name: "Fechado por", value: `${interaction.user} \`\`(${interaction.user.id})\`\``},
        { name: "Canal", value: `${channel.name} \`\`(${channel.id})\`\``},
        { name: "Participantes", value: `\`\`\`${participantsString}\`\`\``},
        { name: "Membros na call", value: `\`\`\`${voiceMembers}\`\`\``},
        { name: "Ticket Aberto por", value: ticketCreator }
      )
      .setTimestamp()
      .setColor("Red");
      
      await sendLog(guild, logEmbed);

      setTimeout(async () => {
        try {
          await channel.delete();
        } catch (error) {
          console.error(`Erro ao deletar o canal de texto: ${error}`);
        }
      }, 5000);
    }
  },
});