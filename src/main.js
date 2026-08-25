import './styles/main.css';
import { Game } from './core/game.js';
import { titleScene } from './scenes/titleScene.js';

const canvas = document.querySelector('#app canvas');
const game = new Game(canvas);
game.start(titleScene);
