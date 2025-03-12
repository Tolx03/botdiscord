module.exports = {
    name: 'messageCreate',
    execute(message, client) {

      if (!message.content.startsWith('!') || message.author.bot) return;
  
      const args = message.content.slice(1).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
  
      const command = client.commands.get(commandName);
      if (!command) return;
  
      try {
        command.execute(message, args);
      } catch (error) {
        console.error(error);
        message.reply('Oups, une erreur est survenue.');
      }
    },
  };
  