import {
    ApplicationCommandDataResolvable,
    Client,
    ClientEvents,
    Collection,
    Partials,
    IntentsBitField,
    BitFieldResolvable,
    GatewayIntentsString,
    ActivityType,
} from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import {
    CommandType,
    ComponentsButton,
    ComponentsModal,
    ComponentsSelect,
} from "../types/CommandsType";
import { EventTypeStructs } from "../types/EventsType";

dotenv.config();

const isValidFile = (fileName: string) =>
    fileName.endsWith(".ts") || fileName.endsWith(".js");

export class BotClient extends Client {
    public commands = new Collection<string, CommandType>();
    public buttons = new Collection<string, ComponentsButton>();
    public selects = new Collection<string, ComponentsSelect>();
    public modals = new Collection<string, ComponentsModal>();

    constructor() {
        super({
            intents: Object.keys(IntentsBitField.Flags) as BitFieldResolvable<
                GatewayIntentsString,
                number
            >,
            partials: [
                Partials.Channel,
                Partials.GuildMember,
                Partials.GuildScheduledEvent,
                Partials.Message,
                Partials.Reaction,
                Partials.ThreadMember,
                Partials.User,
            ],
        });
    }

    public start() {
        this.registerModules();
        this.registerEvents();
        this.login(process.env.CLIENT_TOKEN);
    }

    private registerCommands(commands: ApplicationCommandDataResolvable[]) {
        this.application?.commands
            .set(commands)
            .then(() => {
                console.log('✅ SlashCommands ("/") loaded!'.yellow);
            })
            .catch((err) => {
                console.error(`❌ An error occurred while setting the SlashCommand ("/"): ${err}`.red);
            });
    }

    private registerModules() {
        const slashCommands: ApplicationCommandDataResolvable[] = [];

        const commandPath = path.join(__dirname, "..", "commands");
        fs.readdirSync(commandPath).forEach((dir) => {
            const commandsDir = path.join(commandPath, dir);
            fs.readdirSync(commandsDir)
                .filter(isValidFile)
                .forEach(async (file) => {
                    const command: CommandType = (await import(path.join(commandsDir, file))).default;
                    const { name, buttons, selects, modals } = command;

                    if (name) {
                        this.commands.set(name, command);
                        slashCommands.push(command);

                        console.log(`Processing command: ${name}`.cyan);

                        if (buttons) {
                            console.log(`Buttons: ${JSON.stringify(buttons)}`.cyan);
                            this.handleComponents(buttons, 'button');
                        }
                        if (selects) {
                            console.log(`Selects: ${JSON.stringify(selects)}`.cyan);
                            this.handleComponents(selects, 'select');
                        }
                        if (modals) {
                            console.log(`Modals: ${JSON.stringify(modals)}`.cyan);
                            this.handleComponents(modals, 'modal');
                        }
                    }
                });
        });

        this.on("ready", () => {
            this.registerCommands(slashCommands);
            this.setPresence();
        });
    }

    private handleComponents(components: any, type: 'button' | 'select' | 'modal') {
        if (type === 'button') {
            if (this.isValidComponents(components, 'button')) {
                components.forEach((run: ComponentsButton, key: string) => this.buttons.set(key, run));
            } else {
                console.error('Invalid buttons structure'.red);
            }
        } else if (type === 'select') {
            if (this.isValidComponents(components, 'select')) {
                components.forEach((run: ComponentsSelect, key: string) => this.selects.set(key, run));
            } else {
                console.error('Invalid selects structure'.red);
            }
        } else if (type === 'modal') {
            if (this.isValidComponents(components, 'modal')) {
                components.forEach((run: ComponentsModal, key: string) => this.modals.set(key, run));
            } else {
                console.error('Invalid modals structure'.red);
            }
        }
    }

    private isValidComponents(components: any, type: 'button' | 'select' | 'modal'): boolean {
        if (type === 'button') {
            return components instanceof Collection &&
                [...components.values()].every((value) =>
                    this.isValidButton(value)
                );
        } else if (type === 'select') {
            return components instanceof Collection &&
                [...components.values()].every((value) =>
                    this.isValidSelect(value)
                );
        } else if (type === 'modal') {
            return components instanceof Collection &&
                [...components.values()].every((value) =>
                    this.isValidModal(value)
                );
        }
        return false;
    }

    private isValidButton(button: any): boolean {
        return typeof button === 'object' && button.hasOwnProperty('key') && typeof button.key === 'string';
    }

    private isValidSelect(select: any): boolean {
        return typeof select === 'object' && select.hasOwnProperty('key') && typeof select.key === 'string';
    }

    private isValidModal(modal: any): boolean {
        return typeof modal === 'object' && modal.hasOwnProperty('key') && typeof modal.key === 'string';
    }

    private registerEvents() {
        const eventsPath = path.join(__dirname, "..", "events");
        fs.readdirSync(eventsPath).forEach((dir) => {
            const eventsDir = path.join(eventsPath, dir);
            fs.readdirSync(eventsDir)
                .filter(isValidFile)
                .forEach(async (file) => {
                    const event: EventTypeStructs<keyof ClientEvents> = (await import(path.join(eventsDir, file))).default;
                    const { name, once, run } = event;

                    try {
                        if (name) {
                            once ? this.once(name, run) : this.on(name, run);
                        }
                    } catch (err) {
                        console.error(`An error occurred on event: ${name}\n${err}`.red);
                    }
                });
        });
    }

    private setPresence() {
        this.user?.setPresence({
            activities: [
                {
                    url: "https://www.twitch.tv/discord",
                    name: "DJS: v14.11.0",
                    type: ActivityType.Streaming,
                },
            ],
            status: "idle",
        });
    }

}