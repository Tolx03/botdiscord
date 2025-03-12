const { ChannelType, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Chemin vers le fichier de configuration
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'ticket-config.json');

// Chargement ou création de la configuration
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
  console.error(`Erreur lors de la lecture ou de l'écriture de ${CONFIG_PATH} :`, error);
  // Si le fichier est corrompu, recrée une configuration par défaut
  if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
  }
  config = {
    logsChannelId: null,
    openChannelOrCatId: null,
    closeCategoryId: null,
    ticketCounter: 0,
    staffRoleId: null,
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Fonction pour sauvegarder la configuration
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('Configuration sauvegardée.');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la configuration :', error);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketmenu')
    .setDescription('Afficher un menu pour ouvrir un ticket'),
  async execute(interaction) {
    console.log('Commande /ticketmenu déclenchée');

    // Création du menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('persistent_ticket_menu')
      .setPlaceholder('Choisissez une raison pour ouvrir un ticket')
      .addOptions([
        { label: 'Support technique', description: 'Problème technique ou bug', value: 'support' },
        { label: 'Question', description: 'Posez une question', value: 'question' },
        { label: 'Feedback', description: 'Donnez un avis ou une suggestion', value: 'feedback' },
        { label: 'Autre', description: 'Autre raison', value: 'autre' },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setTitle('Ouvrir un ticket')
      .setDescription('Choisissez une raison dans le menu ci-dessous pour créer un ticket.')
      .setColor('#00ff00');

    await interaction.reply({ embeds: [embed], components: [row] });
    console.log('Menu envoyé à l’utilisateur');
  },
};
