import { ClientEvents } from "discord.js";

export type EventTypeStructs<Key extends keyof ClientEvents> = {
  name: Key;
  once?: boolean;
  run(...args: ClientEvents[Key]): any;
};

export class EventStructs<Key extends keyof ClientEvents> {
    constructor(options: EventTypeStructs<Key>) 
    {  Object.assign(this, options);  }
}