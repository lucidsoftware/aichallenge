# AI Challenge

**Compile the TypeScript:**

```bash
cd viz
npm install && tsc
cd ../lobby
npm install && tsc
cd ../tournament
npm install && tsc && npx ng build
cd ../bot
npm install && tsc
```

**Run the server:**
```bash
cd lobby
node ./dist/lobby.js
```

**Connect bots:**
```bash
cd bot
node ./dist/bot.js localhost 8080 ben
node ./dist/bot.js localhost 8080 ryan
node ./dist/bot.js localhost 8080 brad
node ./dist/bot.js localhost 8080 richard
```

**Open the tournament**

Visit http://localhost:8080/

Click Practice. Once you see the bots listed, click **Play** (if you don't check any boxes, everyone is invited).
