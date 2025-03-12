const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'ticket-config.json');

let config;
try {
  if (fs.existsSync(CONFIG_PATH)) {
    console.log('Chargement de la configuration depuis le fichier...');
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } else {
    console.log('Fichier de configuration introuvable. Création d’une configuration par défaut...');
    config = {
      logsChannelId: null,
      openChannelOrCatId: null,
      closeCategoryId: null,
      ticketCounter: 0,
      staffRoleId: null,
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  }
} catch (error) {
  console.error('Erreur lors du chargement de la configuration:', error);
  config = { logsChannelId: null, openChannelOrCatId: null, closeCategoryId: null, ticketCounter: 0, staffRoleId: null };
}

function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    console.log('interactionCreate déclenché');
    
    // Ajout d’un log pour le type d’interaction
    console.log('Type d’interaction reçu :', interaction.type);
    console.log('customId reçu (le cas échéant) :', interaction.customId);

    // Vérifie si l’interaction est un menu déroulant
    if (!interaction.isStringSelectMenu()) {
      console.log('L’interaction n’est pas un menu déroulant.');
      return;
    }
    
    // Confirme que le customId est celui attendu
    if (interaction.customId === 'persistent_ticket_menu') {
      console.log('customId correct détecté.');
      
      // Réponse différée pour un traitement asynchrone
      await interaction.deferReply({ ephemeral: true });

      const reason = interaction.values[0]; // Récupère la raison sélectionnée
      console.log('Raison sélectionnée :', reason);

      const guild = interaction.guild;
      if (!config.openChannelOrCatId) {
        console.log('Le paramètre "open" n’est pas configuré.');
        return interaction.editReply({ content: 'Le paramètre "open" n’est pas configuré.' });
      }

      const openRef = guild.channels.cache.get(config.openChannelOrCatId);
      if (!openRef) {
        console.log('Le salon ou la catégorie "open" configuré n’existe plus.');
        return interaction.editReply({ content: 'Le salon ou la catégorie "open" configuré n’existe plus.' });
      }

      // Incrémente le compteur pour un nom unique
      config.ticketCounter++;
      saveConfig();
      const ticketName = `ticket-${interaction.user.username}-${config.ticketCounter}`;
      console.log('Nom du ticket généré :', ticketName);

      let parentId = null;
      if (openRef.type === ChannelType.GuildCategory) {
        parentId = openRef.id;
      } else if (openRef.type === ChannelType.GuildText) {
        parentId = openRef.parentId || null;
      }
      console.log('ID du parent déterminé :', parentId);

      try {
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
            // Autorise le rôle staff s’il est configuré
            ...(config.staffRoleId ? [{
              id: config.staffRoleId,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            }] : []),
          ],
        });

        console.log('Canal de ticket créé :', ticketChannel.name);
        
        const embed = new EmbedBuilder()
          .setTitle('Ticket créé')
          .setDescription(`Ticket créé par ${interaction.user}\nNom : **${ticketName}**\nRaison : **${reason}**`)
          .setTimestamp();

        await ticketChannel.send({ embeds: [embed] });
        await interaction.editReply({ content: `Votre ticket a été créé : ${ticketChannel}` });
      } catch (error) {
        console.error('Erreur lors de la création du ticket :', error);
        await interaction.editReply({ content: 'Erreur lors de la création du ticket.' });
      }
    }
  },
};
