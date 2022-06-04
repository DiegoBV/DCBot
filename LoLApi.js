// LOL COUNTER ES KK CAMBIAR
var request = require("request");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
var XMLHttpRequest = require('xhr2');

var apiKey = "?api_key=RGAPI-2dae3f54-ac4b-4891-afee-7a89d25a3d2f";
var championList, championKeys;

class Champion {
    constructor(name, key, mastery) {
        this.name = name;
        this.key = key;
        this.mastery = mastery;
        this.ready = false;
        this.requestChampionCounters();
    }

    getCounters() {
        return this.counters;
    }

    requestChampionCounters() {
        var request = new XMLHttpRequest();
        request.open("GET", "https://lolcounter.com/champions/" + this.name + "/weak", true);
        request.send(null);
        var self = this;
        request.onreadystatechange = function () {
            if (request.readyState == 4) {
                self.counters = [];
                var indexOccurenceStart = request.responseText.indexOf("is Weak Against", 0);
                var indexOccurenceEnd = request.responseText.indexOf("clear", indexOccurenceStart);
                var weakBlock = request.responseText.substring(indexOccurenceStart, indexOccurenceEnd);
                var indexWeakStart = 0, indexWeakEnd = 0;
                do {
                    // busco lo mas especifico que he encontrado para conseguir los counters
                    indexWeakStart = weakBlock.indexOf("/champions/", indexWeakEnd);
                    indexWeakEnd = weakBlock.indexOf("'>", indexWeakStart);
                    // split por /, el nombre esta en la tercera posicion. Hay que comprobar, ademas, que sea un champ
                    // de verdad (esté en championKeys), salen palabras raras sometimes
                    let champName = weakBlock.substring(indexWeakStart, indexWeakEnd).split('/')[2];
                    // si existe ese campeon y no esta ya en los counters, lo añadimos
                    if (championKeys.find(element => element.toLowerCase() == champName?.replace('-', '').toLowerCase())
                        && !self.counters.find(element => element.toLowerCase() == champName.toLowerCase())) {
                        self.counters.push(champName);
                    }
                } while (indexWeakStart != -1);
                console.log("Los counters de " + self.name + " son: ");
                console.log(self.counters);
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
                for (let i = 0; i < 19; i++) {
                    let champ = getChampionInfo(body[i].championId);
                    self.champions.push(new Champion(champ.name, champ.key, body[i].championPoints));
                }
                self.champions.sort(function(a, b) {return b.mastery - a.mastery}); // ordeno just in case
            }
            else {
                console.log(error + " Code: " + response.statusCode + " Message: " + response.statusMessage);
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
                self.summonerID = body.id;
                self.requestChampionMastery(self);
            }
            else {
                console.log(error + " Code: " + response.statusCode + " Message: " + response.message);
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

requestChampionList().then(function (response) {
    // console.log( Object.keys(response.data));
    // console.log(response.data["Aatrox"].id);
    championKeys = Object.keys(response.data);
    //"MonkeyKing", "Wukong"); // fk rito pls
    championList = response.data;
    // requestSummonerId(requestChampionMastery);
    let summ = new Summoner("UnluckyBerry");
    setTimeout(function(){
        console.log(summ.champions[0].counters)
    }, 5000);
});