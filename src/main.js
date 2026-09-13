import { Game } from './js/Game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
window.__crowdRunnerGame = game;
game.run();
