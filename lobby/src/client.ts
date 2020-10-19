import {uuidDense} from './lib/uuid';
export class Client {
    public token = uuidDense();

    public lastSeen: number = Date.now();

    constructor(
        public readonly name: string,
        usedNames: Set<string>,
        public readonly persistent: boolean,
        public readonly ip: string,
    ) {
        console.log('Adding client with name ' + name + ', avoiding existing names ' + Array.from(usedNames).join(','));
        let num = 1;
        while (usedNames.has(this.name) || usedNames.has(this.sanitizeForSave(this.name))) {
            this.name = name + ' (' + (++num) + ')';
        }

        console.log('Using name ' + this.name);
    }

    protected sanitizeForSave(name: string) {
        return name.replace(/[^a-zA-Z0-9() ]/g, '_');
    }

    public serialize(token?: boolean) {
        const data: any = {
            name: this.name,
        };
        if (this.persistent) {
            data.persistent = true;
        }
        if (token) {
            data.token = this.token;
        }
        return data;
    }
}
