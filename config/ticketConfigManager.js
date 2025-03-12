// config/ticketConfigManager.js
const fs = require('fs');
const path = require('path');

// Utiliser process.cwd() pour pointer vers le dossier racine du projet
const CONFIG_PATH = path.join(process.cwd(), 'ticket-config.json');

// Configuration par défaut
const defaultConfig = {
  logsChannelId: null,
  openChannelOrCatId: null,
  closeCategoryId: null,
  ticketCounter: 0,
  staffRoleId: null,
};

/**
 * Lit la configuration depuis ticket-config.json
 * ou crée le fichier avec les valeurs par défaut s'il n'existe pas.
 */
function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erreur lecture config :', error);
      // Si le JSON est corrompu, on retourne les valeurs par défaut
      return { ...defaultConfig };
    }
  } else {
    // Si le fichier n’existe pas, on le crée
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    return { ...defaultConfig };
  }
}

/**
 * Sauvegarde la configuration dans ticket-config.json
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Erreur écriture config :', error);
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  CONFIG_PATH,
  defaultConfig,
};
