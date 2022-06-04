const { Discord, Client, Intents } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');

// LOL COUNTER ES KK CAMBIAR
var request = require("request");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
var XMLHttpRequest = require('xhr2');

var apiKey = "?api_key=RGAPI-52863dd0-bed7-4d1e-8a53-47dc7115347e";
var championList, championKeys;
var MAX_CHAMPS_CONSULTED = 20;
var MAX_COUNTERS = 5;
var MAX_BANS = 5;

class Champion {
    constructor(name, key, mastery, lastPlayTime) {
        this.name = name;
        this.key = key;
        this.mastery = mastery;
        this.lastPlayTime = lastPlayTime;
        this.ready = false;
        this.requestChampionCounters();
        this.setChampScore();
    }

    setChampScore() {
        this.score = (this.mastery + (this.lastPlayTime / 100000));
    }

    getCounters() {
        return this.counters;
    }

    requestChampionCounters() {
        var request = new XMLHttpRequest();
        request.open("GET", "https://www.leagueofgraphs.com/es/champions/counters/" + this.name.toLowerCase().replace(" ", "").replace("'", ""), true);
        request.send(null);
        var self = this;
        request.onreadystatechange = function () {
            if (request.readyState == 4) {
                self.counters = [];
                var indexOccurenceStart = request.responseText.indexOf("pierde la línea contra", 0);
                var indexOccurenceEnd = request.responseText.indexOf("</table>", indexOccurenceStart);
                var weakBlock = request.responseText.substring(indexOccurenceStart, indexOccurenceEnd);
                var indexWeakStart = 0, indexWeakEnd = 0;
                do {
                    // busco lo mas especifico que he encontrado para conseguir los counters
                    indexWeakStart = weakBlock.indexOf('vs-', indexWeakEnd);
                    indexWeakEnd = weakBlock.indexOf('">', indexWeakStart);
                    // split por /, el nombre esta en la tercera posicion. Hay que comprobar, ademas, que sea un champ
                    //console.log(weakBlock.substring(indexWeakStart, indexWeakEnd + 10))
                    // de verdad (esté en championKeys), salen palabras raras sometimes
                    //console.log(weakBlock.substring(indexWeakStart, indexWeakEnd).split('vs-'))
                    let champName = weakBlock.substring(indexWeakStart, indexWeakEnd).split('vs-')[1];
                 
                    // si existe ese campeon y no esta ya en los counters, lo añadimos
                    if (championKeys.find(element => element.toLowerCase() == champName?.replace('-', '').toLowerCase())
                        && !self.counters.find(element => element.toLowerCase() == champName.toLowerCase())) {
                        self.counters.push(champName);
                    }
                } while (indexWeakStart != -1);
                // console.log("Los counters de " + self.name + " son: ");
                // console.log(self.counters);
                self.ready = true;
            }
        }
    }
}

class Summoner {
    constructor(summonerName) {
        this.summonerName = summonerName;
        this.champions = [];
        // id, array con los champs mas jugados
        this.requestSummonerID();
    }

    requestChampionMastery(self) {
        request({
            url: "https://euw1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/" + self.summonerID + apiKey,
            json: true,
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                for (let i = 0; i < MAX_CHAMPS_CONSULTED; i++) {
                    let champ = getChampionInfo(body[i].championId);
                    self.champions.push(new Champion(champ.name, champ.key, body[i].championPoints, body[i].lastPlayTime));
                }
                self.champions.sort(function (a, b) { return b.score - a.score; }); // ordeno
                self.champions = self.champions.slice(0, MAX_COUNTERS);
            }
            else {
                console.log("error");
            }
        });
    };

    requestSummonerID() {
        var self = this;
        request({
            url: "https://euw1.api.riotgames.com/tft/summoner/v1/summoners/by-name/" + self.summonerName + apiKey,
            json: true,
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                self.summonerLevel = body.summonerLevel;
                self.summonerID = body.id;
                self.requestChampionMastery(self);
            }
            else {
                console.log("error");
            }
        });
    };
}

async function requestChampionList() {
    var response = await fetch("http://ddragon.leagueoflegends.com/cdn/12.10.1/data/en_US/champion.json");
    var results = await response.json();
    return results;
}

function getChampionInfo(id) {
    let i = 0;
    while (i < championKeys.length) {
        if (championList[championKeys[i]].key == id) {
            return championList[championKeys[i]];
        }
        i++;
    }
}



const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.on("ready", () => {
    console.log("OPClashBot Online!");
    //console.log(token + " " + guildId + " " + clientId);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    }
    else if (commandName === 'server') {
        await interaction.reply(`Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`);
    }
    else if (commandName === 'user') {
        await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
    }
});

client.on("messageCreate", message => {
    if (message.author.bot)
        return;
    // hago esto ya que las interacciones no pueden ser largas ni mandar varios mensajes
    if (message.content.includes("!counter")) {
        let params = message.content.split(" ");
        if (params[1] == undefined) {
            message.channel.send("Pero dame un nombre de invocador mi niñññ");
            return;
        }

        let summoner = new Summoner(params[1]);
        message.channel.send("-------------------------" + summoner.summonerName + "----------------------------");
        setTimeout(function () {
            for (let i = 0; i < summoner.champions.length; i++) {
                if (summoner.champions[i].counters.length == 0) {
                    message.channel.send("Los counters de " + summoner.champions[i].name + " no están disponibles");
                    continue;
                }
                message.channel.send("------------------------------------------------------------");
                message.channel.send("Los counters de " + summoner.champions[i].name + " son:");
                let countersString = "";
                for (let j = 0; j < summoner.champions[i].counters.length; j++) {
                    countersString += summoner.champions[i].counters[j] + ", ";
                }
                message.channel.send(countersString + ".");
            }
            message.channel.send("------------------------/" + summoner.summonerName + "/---------------------------");
        }, 3000);
    }
    else if (message.content.includes("!clash-bans")) {
        // inventarme algoritmo que tenga en cuenta el nivel de cada summoner y nivel de maestria de cada uno y los ordene en los mejores 5 bans
        let params = message.content.split(" ");
        if (params.length <= 0) {
            message.channel.send("Dame nombressssss");
            return;
        }
        message.channel.send("Bans recomendados (pls wait): ");
        let allChamps = [];
        for (let i = 1; i < params.length; i++) {
            let summoner = new Summoner(params[i]);
            //console.log(summoner.champions) // not readyyy
            setTimeout(function () {
                allChamps = allChamps.concat(summoner.champions);
            }, 3000); // feisimo i know, pero pereza
        }
        setTimeout(function () {
            allChamps.sort(function (a, b) { return b.score - a.score; }); // ordeno
            // eliminar duplicados?
            let auxNamesArray = [];
            allChamps.forEach(element => {
                if(!auxNamesArray.includes(element.name)) {
                    auxNamesArray.push(element.name);
                }
            });
            
            auxNamesArray = auxNamesArray.slice(0, MAX_BANS);
            for (let i = 0; i < auxNamesArray.length; i++) {
                message.channel.send(auxNamesArray[i] + "!");
            }
        }, (params.length - 1) * 1500);

    }
});


requestChampionList().then(function (response) {
    // console.log( Object.keys(response.data));
    // console.log(response.data["Aatrox"].id);
    championKeys = Object.keys(response.data);
    //"MonkeyKing", "Wukong"); // fk rito pls
    championList = response.data;
    // requestSummonerId(requestChampionMastery);
    // let summ = new Summoner("UnluckyBerry");

    client.login(token); // token. Must be last line
    // DEPLOY BOT????
});