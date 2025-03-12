const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(process.cwd(), 'ticket-config.json');

// Configuration par défaut
const defaultConfig = {
  logsChannelId: null,       // Salon de logs
  openChannelOrCatId: null,  // Salon ou catégorie pour l'ouverture
  closeCategoryId: null,     // Catégorie pour les tickets fermés
  ticketCounter: 0,          // Compteur pour nommer les tickets de manière unique
  staffRoleId: null,         // Rôle staff pour accès aux tickets
};

// Chargement de la configuration depuis le fichier JSON
let config;
try {
  if (fs.existsSync(CONFIG_PATH)) {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } else {
    config = defaultConfig;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
  }
} catch (error) {
  console.error('Erreur lors du chargement de la configuration:', error);
  config = defaultConfig;
}

// Fonction pour sauvegarder la configuration dans le fichier JSON
function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Système de ticket (configuration, ouverture, fermeture)')
    // Sous-commande "setup" pour configurer les paramètres du système de ticket
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Configurer un paramètre du système de tickets')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Quel paramètre configurer ?')
            .setRequired(true)
            .addChoices(
              { name: 'Salon de logs', value: 'logs' },
              { name: 'Ouverture (salon/catégorie)', value: 'open' },
              { name: 'Catégorie de fermeture', value: 'close' },
              { name: 'Rôle staff', value: 'staff' }
            )
        )
        // Pour logs, open et close, on utilise un channel; pour staff, un role
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Le salon/catégorie correspondant (pour logs, open, close)')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Le rôle staff (pour staff)')
            .setRequired(false)
        )
    )
    // Sous-commande "open" pour ouvrir un nouveau ticket
    .addSubcommand(subcommand =>
      subcommand
        .setName('open')
        .setDescription('Ouvrir un nouveau ticket')
    )
    // Sous-commande "close" pour fermer le ticket actuel
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('Fermer le ticket actuel')
    ),

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();

    // ===============================
    // 1) Configuration (setup)
    // ===============================
    if (subcommand === 'setup') {
      const type = interaction.options.getString('type');
      const channel = interaction.options.getChannel('channel');
      const role = interaction.options.getRole('role');

      try {
        if (type === 'logs') {
          if (!channel || channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Pour "logs", tu dois choisir un salon textuel.', ephemeral: true });
          }
          config.logsChannelId = channel.id;
          saveConfig();
          return interaction.reply({ content: `Salon de logs configuré : ${channel}.`, ephemeral: true });
        }
        else if (type === 'open') {
          if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildCategory)) {
            return interaction.reply({ content: 'Pour "open", tu dois choisir un salon textuel ou une catégorie.', ephemeral: true });
          }
          config.openChannelOrCatId = channel.id;
          saveConfig();
          return interaction.reply({ content: `Paramètre "open" configuré : ${channel}.`, ephemeral: true });
        }
        else if (type === 'close') {
          if (!channel || channel.type !== ChannelType.GuildCategory) {
            return interaction.reply({ content: 'Pour "close", tu dois choisir une catégorie.', ephemeral: true });
          }
          config.closeCategoryId = channel.id;
          saveConfig();
          return interaction.reply({ content: `Catégorie de fermeture configurée : ${channel.name}.`, ephemeral: true });
        }
        else if (type === 'staff') {
          if (!role) {
            return interaction.reply({ content: 'Pour "staff", tu dois choisir un rôle.', ephemeral: true });
          }
          config.staffRoleId = role.id;
          saveConfig();
          return interaction.reply({ content: `Rôle staff configuré : ${role}.`, ephemeral: true });
        }
      } catch (error) {
        console.error(error);
        return interaction.reply({ content: 'Une erreur est survenue lors de la configuration.', ephemeral: true });
      }
    }

    // ===============================
    // 2) Ouverture d'un ticket (open)
    // ===============================
    else if (subcommand === 'open') {
      try {
        if (!config.openChannelOrCatId) {
          return interaction.reply({ content: 'Le système de ticket n\'est pas configuré : paramètre "open" manquant.', ephemeral: true });
        }
        const guild = interaction.guild;
        const openRef = guild.channels.cache.get(config.openChannelOrCatId);
        if (!openRef) {
          return interaction.reply({ content: 'Le salon/catégorie "open" configuré n\'existe plus.', ephemeral: true });
        }
        // Incrémente le compteur pour obtenir un nom unique
        config.ticketCounter++;
        saveConfig();
        const ticketName = `ticket-${interaction.user.username}-${config.ticketCounter}`;

        let parentId = null;
        if (openRef.type === ChannelType.GuildCategory) {
          parentId = openRef.id;
        } else if (openRef.type === ChannelType.GuildText) {
          parentId = openRef.parentId || null;
        }

        const ticketChannel = await guild.channels.create({
          name: ticketName,
          type: ChannelType.GuildText,
          parent: parentId,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
            // Autorise le rôle staff si configuré
            ...(config.staffRoleId ? [{
              id: config.staffRoleId,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            }] : [])
          ],
        });

        // Embed pour annoncer la création du ticket
        const embed = new EmbedBuilder()
          .setTitle('Ticket créé')
          .setDescription(`Ticket créé par ${interaction.user}\nNom du ticket : **${ticketName}**`)
          .setTimestamp();

        await ticketChannel.send({ embeds: [embed] });
        await interaction.reply({ content: `Ticket créé : ${ticketChannel}`, ephemeral: true });

        // Log dans le salon de logs si configuré
        if (config.logsChannelId) {
          const logsChannel = guild.channels.cache.get(config.logsChannelId);
          if (logsChannel) {
            logsChannel.send(`Nouveau ticket créé : ${ticketChannel} par ${interaction.user}`);
          }
        }
      } catch (error) {
        console.error(error);
        return interaction.reply({ content: 'Une erreur est survenue lors de la création du ticket.', ephemeral: true });
      }
    }

    // ===============================
    // 3) Fermeture d'un ticket (close)
    // ===============================
    else if (subcommand === 'close') {
      try {
        const channel = interaction.channel;
        if (!config.closeCategoryId) {
          return interaction.reply({ content: 'Le système de ticket n\'est pas configuré : paramètre "close" manquant.', ephemeral: true });
        }
        if (!channel.name.startsWith('ticket-')) {
          return interaction.reply({ content: 'Cette commande doit être utilisée dans un salon de ticket.', ephemeral: true });
        }
        await channel.setParent(config.closeCategoryId);
        await interaction.reply({ content: `Le ticket est fermé. Il est déplacé dans la catégorie "close".`, ephemeral: false });

        if (config.logsChannelId) {
          const logsChannel = interaction.guild.channels.cache.get(config.logsChannelId);
          if (logsChannel) {
            logsChannel.send(`Le ticket ${channel} a été fermé par ${interaction.user}`);
          }
        }

        // Bouton pour supprimer définitivement le ticket
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('delete_ticket')
            .setLabel('Supprimer ce ticket')
            .setStyle(ButtonStyle.Danger)
        );

        const embedClose = new EmbedBuilder()
          .setTitle('Ticket fermé')
          .setDescription('Cliquez sur le bouton ci-dessous pour supprimer ce ticket définitivement.')
          .setTimestamp();

        await channel.send({ embeds: [embedClose], components: [row] });
      } catch (error) {
        console.error(error);
        return interaction.reply({ content: 'Une erreur est survenue lors de la fermeture du ticket.', ephemeral: true });
      }
    }
  },
};
