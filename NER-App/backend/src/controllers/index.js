/**
 * Controller Registry
 * Modular exports for all application controllers
 */

const documentController = require('./documentController');
const entityController = require('./entityController');
const lineController = require('./lineController');
const predictController = require('./predictController');
const exportController = require('./exportController');

module.exports = {
  documentController,
  entityController,
  lineController,
  predictController,
  exportController,
};
