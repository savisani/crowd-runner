import { Game } from './js/Game.js';

let game = null;
let starting = false;

const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const restartBtn = document.getElementById('restart-btn');
const gameoverScreen = document.getElementById('gameover-screen');

function hideStartScreen() {
  if (startScreen) startScreen.classList.add('hidden');
}

function showGameOver() {
  if (gameoverScreen) gameoverScreen.classList.remove('hidden');
}

function hideGameOver() {
  if (gameoverScreen) gameoverScreen.classList.add('hidden');
}

function handleStart() {
  if (starting) return;
  if (game && game.state === 'playing') return;

  starting = true;

  try {
    if (!game) {
      const canvas = document.getElementById('game-canvas');
      game = new Game(canvas);
      window.__crowdRunnerGame = game;
      game.run();
    }

    game.start();
  } catch (e) {
    console.error('Failed to start game:', e);
    starting = false;
    return;
  }

  starting = false;
}

function handleRestart() {
  if (!game) return;
  game.restart();
}

if (startBtn) {
  startBtn.addEventListener('click', handleStart);
}

if (restartBtn) {
  restartBtn.addEventListener('click', handleRestart);
}
