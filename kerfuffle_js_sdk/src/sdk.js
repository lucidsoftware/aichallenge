"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const readline = require("readline");
class AuthError extends Error {
}
function fullBody(req) {
    return new Promise(done => {
        let body = '';
        req.on('readable', () => {
            const part = req.read();
            if (part !== null) {
                body += part;
            }
        });
        req.on('end', () => {
            done(body);
        });
    });
}
function joinLobby(host, port, name, persistent, count = 0) {
    return new Promise((done, fail) => {
        const req = http.request({ host, port, path: '/players', method: 'POST', headers: { 'Content-Type': 'application/json' } });
        req.write(JSON.stringify({ name, persistent }));
        req.end();
        req.on('response', async (res) => {
            if (res.statusCode === 201) {
                done(JSON.parse(await fullBody(res)));
            }
            else if (count < 50) {
                console.log('Failed to connect. Retrying...');
                await sleep(1000);
                done(await joinLobby(host, port, name, persistent, count + 1));
            }
            else {
                fail(new Error('Failed to connect'));
            }
        });
        req.on('error', async (err) => {
            if (count < 50) {
                console.log('Failed to connect. Retrying...');
                await sleep(1000);
                done(await joinLobby(host, port, name, persistent, count + 1));
            }
            else {
                fail(err);
            }
        });
    });
}
function listGames(host, port, token) {
    return new Promise((done, fail) => {
        const req = http.request({
            host,
            port,
            path: '/games',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
            }
        });
        req.end();
        req.on('response', async (res) => {
            if (res.statusCode === 200) {
                done(JSON.parse(await fullBody(res)));
            }
            else if (res.statusCode === 403 || res.statusCode === 401) {
                fail(new AuthError());
            }
            else {
                fail(new Error('Failed to list games'));
            }
        });
        req.on('error', fail);
    });
}
function sendMove(host, port, token, gameName, data) {
    return new Promise((done, fail) => {
        const req = http.request({
            host,
            port,
            path: '/games/' + encodeURIComponent(gameName),
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
            }
        });
        req.write(JSON.stringify(data));
        req.end();
        req.on('response', async (res) => {
            if (res.statusCode === 200) {
                const raw = JSON.parse(await fullBody(res));
                raw.board = !raw.over && raw.board && raw.board.map((row) => row.map(space => {
                    const [owner, tail] = space.split(',').map(i => parseInt(i, 10)).map(i => isNaN(i) ? undefined : i);
                    return { owner, tail };
                }));
                done(raw);
            }
            else {
                console.log(res);
                fail(new Error('Failed to send move'));
            }
        });
        req.on('error', fail);
    });
}
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
async function question(prompt) {
    return new Promise(done => {
        rl.question(prompt, done);
    });
}
async function sleep(ms) {
    return new Promise(done => setTimeout(done, ms));
}
async function joinFirstAvailableGame(host, port, token) {
    console.log('Checking for available games...');
    let games = [];
    while (games.length == 0) {
        games = await listGames(host, +port, token);
        if (games.length == 0) {
            await sleep(1000);
        }
    }
    console.log('Auto-joining game ' + games[0].name);
    return games[0].name;
}
const [nodePath, jsPath, host, port, name, persistent] = process.argv;
async function play(botConstructor) {
    // Register the player, get a bearer token
    let player = await joinLobby(host, +port, name, !!persistent);
    console.log('Player name assigned: ' + player.name);
    while (true) {
        // Poll for games we're eligible for. As soon as any appear, offer the list
        // to the user to select one to join, along with an option to refresh the
        // list.
        try {
            const gameName = await joinFirstAvailableGame(host, +port, player.token);
            let state = await sendMove(host, +port, player.token, gameName, []);
            if (state.over) {
                continue;
            }
            let playerId = -1;
            state.players.forEach(p => {
                if (player.name == p.name) {
                    playerId = p.id;
                }
            });
            const bot = new botConstructor(state, player.name, playerId);
            while (true) {
                const moves = bot.getMoves(state);
                state = await sendMove(host, +port, player.token, gameName, moves);
                if (state.over) {
                    console.log('Game over');
                    break;
                }
            }
        }
        catch (e) {
            if (e instanceof AuthError || (e instanceof Error && e.code === 'ECONNREFUSED')) {
                console.log('Server connection lost. Reconnecting...');
                player = await joinLobby(host, +port, name, !!persistent);
                console.log('Player name assigned: ' + player.name);
            }
            else {
                console.log('Error playing game. Back to lobby.');
                console.error(e);
            }
        }
    }
}
exports.play = play;
