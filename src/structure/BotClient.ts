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

import { CommandType } from "../types/CommandsType";
import { EventTypeStructs } from "../types/EventsType";

dotenv.config();

const isValidFile = (fileName: string) =>
    fileName.endsWith(".ts") || fileName.endsWith(".js");

export class BotClient extends Client {
    public commands = new Collection<string, CommandType>();
    public events = new Collection<string, EventTypeStructs<keyof ClientEvents>>();

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
                console.log('┌───────────────────────────┐\n│ ✅ SlashCommands loaded!   │\n└───────────────────────────┘'.yellow);
                this.commands.forEach((command) => {
                    console.log(`Processing command: ${command.name}`);
                });
            })
            .catch((err) => {
                console.error(`❌ An error occurred while setting up SlashCommands: ${err}`.red);
            });
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
                            this.events.set(name, event);
                            once ? this.once(name, run) : this.on(name, run);
                            console.log(`Processing event: ${name}`.cyan);
                        }
                    } catch (err) {
                        console.error(`An error occurred in the event: ${name}\n${err}`.red);
                    }
                });
        });
        console.log('┌───────────────────────────┐\n│ ✅ Events loaded!          │\n└───────────────────────────┘'.yellow);
        this.events.forEach((event) => {
            console.log(`Loaded event: ${event.name}`);
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
                    const { name } = command;

                    if (name) {
                        this.commands.set(name, command);
                        slashCommands.push(command);
                    }
                });
        });

        this.on("ready", () => {
            this.registerCommands(slashCommands);
            this.setPresence();
            console.log(`🤖 Bot online! Logged in as ${this.user?.tag}`.green);
        });
    }

    private setPresence() {
        this.user?.setPresence({
            activities: [
                {
                    url: "https://www.twitch.tv/discord",
                    name: "Fxsh",
                    type: ActivityType.Streaming,
                },
            ],
            status: "idle",
        });
    }
}