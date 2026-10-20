import { CORE_VERSION } from '@draycol/core';

const app = document.getElementById('app');
if (app) app.textContent = `Draycol Survival (core ${CORE_VERSION})`;
