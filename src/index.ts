import { BotClient } from './structure/BotClient';
export * from 'colors';
import configColors from './configColors.json'

import fs from 'fs';
import path from 'path';

const client = new BotClient();

client.start();

export { 
    client,
    configColors
};