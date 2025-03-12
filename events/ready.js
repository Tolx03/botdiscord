const { REST, Routes } = require('discord.js');
const { clientId, guildId } = require('../config/config');
const commandsData = require('../config/commandsData');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Connecté en tant que ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
      console.log('(Re)déploiement des commandes slash...');
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandsData },
      );
      console.log('Commandes déployées avec succès.');
    } catch (error) {
      console.error('Erreur lors du déploiement :', error);
    }
  },
};
