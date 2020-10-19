export class InputWaiter {
    constructor(
        private readonly min: number,
        private readonly max: number,
    ) {
    }

    private callback: () => void;
    private minTimer: NodeJS.Timer|undefined;
    private maxTimer: NodeJS.Timer|undefined;
    private inputArrived = false;

    public waitForInput() {
        this.inputArrived = false;

        this.minTimer = setTimeout(() => {
            this.minTimer = undefined;
            if (this.inputArrived) {
                this.resolve();
            }
        }, this.min);

        this.maxTimer = setTimeout(() => this.resolve(), this.max);

        return new Promise(done => this.callback = done);
    }

    private resolve() {
        this.clearTimers();
        this.callback();
    }

    private clearTimers() {
        if (this.maxTimer) {
            clearTimeout(this.maxTimer);
            this.maxTimer = undefined;
        }
        if (this.minTimer) {
            clearTimeout(this.minTimer);
            this.minTimer = undefined;
        }
    }

    public allInputArrived() {
        this.inputArrived = true;
        if (this.minTimer === undefined) {
            this.resolve();
        }
    }
}