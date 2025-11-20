/**
 * GameEngine.js - Node.js Test Compatibility Wrapper
 * 
 * This file provides CommonJS exports for the GameEngine class to support
 * Node.js-based test environments. The actual implementation is in gameEngine.js.
 * 
 * File naming note:
 * - GameEngine.js (this file): Upper-case, Node.js test wrapper with require/exports
 * - gameEngine.js: Lower-case, main implementation file with ES6+ browser code
 * 
 * This separation allows tests to run in Node.js while the browser loads gameEngine.js.
 */
const GameEngine = require('./gameEngine.js');

module.exports = GameEngine;
