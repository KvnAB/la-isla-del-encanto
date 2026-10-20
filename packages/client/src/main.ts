import './styles.css';
import { App } from './app';

const root = document.getElementById('app');
if (!root) throw new Error('No existe #app');
void new App(root).start();
