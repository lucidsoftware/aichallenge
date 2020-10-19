
export function uuidDense(validChars?: string): string {
    const seed = validChars || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ret = '';

    function append(data: number, n: number) {
        for (let i = 0; i < n; i++) {
            ret += seed[data % seed.length];
            data = Math.floor(data / seed.length);
        }
    }

    // Start the UUID with 4 digits of seed from the current date/time in seconds
    //(which is almost a year worth of second data).
    append(Math.floor(Date.now() / 1000), 4);

    // Chrome provides only 32 bits of randomness
    append(Math.floor(Math.random() * Math.pow(seed.length, 4)), 4);
    append(Math.floor(Math.random() * Math.pow(seed.length, 4)), 4);
    return ret;
}
