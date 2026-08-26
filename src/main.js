import './styles/main.css';
import { Game } from './core/game.js';
import { GAME_WIDTH, GAME_HEIGHT } from './core/config.js';
import { titleScene } from './scenes/titleScene.js';

const canvas = document.querySelector('#app canvas');
const game = new Game(canvas, { width: GAME_WIDTH, height: GAME_HEIGHT });
game.start(titleScene);
