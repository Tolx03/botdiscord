const fs = require('fs');
const path = require('path');

const commandsData = [];

const commandsPath = path.join(__dirname, '../commands'); 

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  commandsData.push(command.data.toJSON());
}

module.exports = commandsData;
