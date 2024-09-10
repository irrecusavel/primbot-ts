import {
    ApplicationCommandData,
    CommandInteraction,
    CommandInteractionOptionResolver,
} from "discord.js";
import { BotClient } from '../structure/BotClient';

interface CommandProps {
    client: BotClient;
    interaction: CommandInteraction;
    options: CommandInteractionOptionResolver;
}

export type CommandType = ApplicationCommandData & {
    run(props: CommandProps): any;
};

export class Command {
    constructor(options: CommandType) {
        options.dmPermission = false;
        Object.assign(this, options);
    }
}