//
// CONSTANTS
//


process.on('uncaughtException', err =>{console.log(err)})
process.on('unhandledRejection', err =>{console.log(err)})
const Discord = require("discord.js");
const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [ 'DIRECT_MESSAGES',   'GUILD_PRESENCES',
'GUILD_MEMBERS',
'GUILDS',
'GUILD_VOICE_STATES',
'GUILD_MESSAGES',
'GUILD_MESSAGE_REACTIONS'] });

//const client = new Discord.client();
const mineflayer = require("mineflayer");
const moment = require("moment"); 
const momenttz = require("moment-timezone");
const fs = require("fs");
const yaml = require("js-yaml");
const math = require("mathjs");
const sm = require("string-similarity");
const ms = require("ms");
const numeral = require("numeral");
const readline = require("readline");
const cn = require("comma-number");
const cron = require("node-cron");
const prettyMilliseconds = require("pretty-ms");
const chalk = require("chalk");
const EasyMatch = require('@notlegend/easymatch');
const sqlite3 = require('sqlite3');
//import { createRequire } from "module";
/*
const { Client, Intents } = require('discord.js');

//import Client from 'discord.js';
//import { Intents } from 'discord.js';
import mineflayer from 'mineflayer';
import moment from 'moment';
import fs from 'fs';
import yaml from 'js-yaml';
//import Math from 'mathjs';
import sm from 'string-similarity';
import ms from 'ms';
import numeral from 'numeral';
import readline from 'readline';
import cn from 'comma-number';
import cron from 'node-cron';
import prettyMilliseconds from 'pretty-ms';
import chalk from 'chalk';
import EasyMatch from '@notlegend/easymatch';
import sqlite3 from 'sqlite3';
//import { Intents } from 'discord.js'
const client = new Client({ intents: [ 'DIRECT_MESSAGES', 'GUILD_MESSAGES' ] });
*/


let db = new sqlite3.Database(__dirname+`/database/database.sqlite`, (err) => {
	if (err) return console.error(err.message)
	console.log("Database connected!")
})

db.serialize(function() {
	db.run("CREATE TABLE IF NOT EXISTS baltop (pos INT, ign TEXT, value TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS ftop (pos INT, faction TEXT, value TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS verified (discord TEXT, ign TEXT, code TEXT, verified TEXT, deposits INT, walls INT, buffers INT)");
    db.run("CREATE TABLE IF NOT EXISTS rotations (user TEXT, rotated TEXT, server TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS settigns (feature TEXT, channel TEXT, enabled TEXT, message TEXT DEFAULT 'null')");
});


let bot; 
let config = yaml.load(fs.readFileSync(`./config.yml`, "utf8"))
let prefix = config["Discord_Configs"]["prefix"]

// FILE PATHS
let payPal = `./Data/paypal.json`;
let configpath = `./Configs/config.json`;
let permpath = `./Configs/permissions.json`;
let playtimepath = `./Data/playtime.json`;
let verifiedPath = `./Data/verifiedUsers.json`;
let RRPath = `./Data/rotate-roster.json`;
let userStatsPath = `./Data/userStats.json`;
let otherInfoPath = `./Data/otherInfo.json`;



// WALL CHECKS & BUFFER CHECKS
let wallsOverdue = 0
let buffersOverdue = 0

let args = [];

//Rotations
let rotateCheck;
let rotatePlayers = []
let rotateTimeout;
// FTOP
let timeOut;
let ftopMSG;
let ftopReadyToSend = false
let rawFTop = []

// FWHO
let fwhoTimeout;
let fwhoReady = false
let fwhoChannel;
let fWhoData = []

// FWHO ONLINE
let fwhoOnlineTimeout;
let fwhoOnlineReady = false
let fwhoOnlineChannel;
let fWhoOnlineData = []
let fOnlineFac;

//FWHO OFFLINE
let fwhoOfflineTimeout;
let fwhoOfflineReady = false
let fwhoOfflineChannel;
let fWhoOfflineData = []
let fOfflineFac;

// PLAYER ONLINE
let status = []
let player = []

// FLIST
let flistTimeout;
let flistReady = false
let flistChannel;
let flistData = []
let flistSplit = []
let flistFacs = []
let flistOn = []
let flistLand = []
let flistPMP = []

// force
let forceTimeout;
let forceReady = false
let forceChannel;
let forceData = []

// BALANCE
let balanceData;
let balanceReady = false;
let balanceChannel;
let balPerson;

// BALANCE TOP
let balanceTopData = []
let balanceTopReady = false;
let balanceTopChannel;

// WEEWOO
let weewooIsEnabled = false;

// COOLDOWNS
let cooldowns = {}

// MATCHER
let matcher = new EasyMatch(`[`, `]`);

// BOT LOGIN REASON
let botReason = {
    host: config["altinfo"]["serverIP"],
    port: config["altinfo"]["serverPort"],
    username: config["altinfo"]["email"],
    password: config["altinfo"]["password"],
    version: config["altinfo"]["version"],
    auth: "microsoft",
    viewDistance: "tiny",
    session: reload(`./session.json`).session,
    logErrors: false,
    plugins : {
        blocks : false,
        sound : false,
        physics : false,
        block_actions : false
    }
  }

//
// EMBED COLORS
//
let maincolor = `#0aa0aa`;
let errorcolor = `#d63b3b`;

//
// FUNCTIONS
//

function rotateLog(rUser, user){
    let rotateMsg = `${rUser} was rotated for ${user}`
    let writeData = `\r\n${getFormattedTime(new Date())} - ${rotateMsg}`
    db.run(`INSERT INTO rotations VALUES('${user}', '${rUser}', '${config.serverip}')`)
    // fs.writeFile(`./rotate/rotateLOG${config["altinfo"]["serverIP"]}.txt`, writeData, { flag: 'a+' }, () => {})
}



function rotateEmbed(rotateUser, invUser){
    console.log(rotateUser, invUser)
    let cfg = reload(configpath)

    let rMsg = cfg["configuration"]["Messages"]["rotateMsg"]

    rMsg = rMsg.replace(/\[rUser]+/, `**${rotateUser}**`)
    rMsg = rMsg.replace(/\[user]+/, `**${invUser}**`)

    let embed = new Discord.MessageEmbed()
    .setDescription(`${rMsg}`)
    .setColor(maincolor)
    .setTimestamp();
    //SENDING EMBED
    client.channels.cache.get(cfg["configuration"]["Channels"]["rotateLogChannel"]).send(embed)
}


function bufferCheck(ign) {
    db.all(`SELECT * FROM verified WHERE ign='${ign}'`,async (err,verified)=>{
        if(err) return console.log(err);
        db.all(`SELECT * FROM channels`, (err,settigns)=>{
            if(err) return console.log(err)
            if(settings[0].buffer !== 'null'){
                let bufferChannel = settings[0].buffer
                bufferChannel = client.channels.cache.get(bufferChannel)
                if(!bufferChannel) return
                let totalBuffer = verified[0].buffers + 1
                db.run(`UPDATE verifed SET buffers=${totalBuffer} WHERE ign='${ign}'`)
                db.all(`SELECT * FROM verified ORDER BY buffers ASC`,(err,leaderboard)=>{
                    if(err) return console.log(err)
                    for(i in leaderboard){
                        if(leaderboard[i].ign == ign){
                            let bufferEmbed = new Discord.MessageEmbed()
                            .setColor(maincolor)
                            .setTitle(`**Buffers have been checked!**`)
                            .addField(`**Discord:**`,`<@${userDiscord}>`,true)
                            .addField(`**In game name:`,`\`${ign}\``,true)
                            .addField(`Checked at:`,`${getFormattedTime(new Date())}`,true)
                            .setDescription(`**Total checks:** ${totalAmount} - #${leaderboard[i]}`)
                            .setThumbnail(`https://minotar.net/helm/${ign}/190.png`)
                            bufferChannel.send(bufferEmbed)
                        }
                    }
                })
            }
        })
    });
}

function weeWoo(ign) {
    let verifiedDB = reload(verifiedPath)
    let maincfg = reload(configpath)

    let userDiscord = client.users.cache.get(verifiedDB[ign]["Discord"])
    let wallChannel
    if(maincfg["configuration"]) {
        if(maincfg["configuration"]["Channels"]) {
            if(maincfg["configuration"]["Channels"]["wallChannel"]) {
                wallChannel = maincfg["configuration"]["Channels"]["wallChannel"]
            } else return
        } else return
    } else return

    wallChannel = client.channels.cache.get(wallChannel)
    if(!wallChannel) return
    
    let roles = config["ingame_configs"]["roles_toTag"]

    let realRoles = []

    let msg = {
        "guild" : client.guilds.get(config["Discord_Configs"]["main_guild"])
    }

    roles.cache.forEach(lolxd => {
        realRoles.push(getRole(msg, lolxd) == false ? `Not a role [${lolxd}]` : getRole(msg, lolxd).toString())
    })

    let message = `${realRoles.join(" ")}`

    wallChannel.send(message).then(res => {
        res.delete()
    })
    wallChannel.send(message).then(res => {
        res.delete()
    })
    wallChannel.send(message).then(res => {
        res.delete()

        let embed = new Discord.MessageEmbed()
        .setColor(errorcolor)
        .setDescription(`:boom: WeeWoo has been set off by ${userDiscord}`)

        res.channel.send(embed)
    })

    if(maincfg["configuration"]) {
        if(maincfg["configuration"]["Messages"]) {
            if(maincfg["configuration"]["Messages"]["weewooMsg"]) {
               if(bot) {
                   if(config["ingame_configs"]["ingame_features_isEnabled"] == false) return
                   if(config["ingame_configs"]["weewoo_ingame"] == false) return

                   bot.chat(maincfg["configuration"]["Messages"]["weewooMsg"])
               }
            }
        }
    }
}

function wallCheck(ign) {
    db.all(`SELECT * FROM verified WHERE ign='${ign}'`,async (err,verified)=>{
        if(err) return console.log(err);
        db.all(`SELECT * FROM channels`, (err,settigns)=>{
            if(err) return console.log(err)
            if(settings[0].walls !== 'null'){
                let bufferChannel = settings[0].walls
                bufferChannel = client.channels.cache.get(bufferChannel)
                if(!bufferChannel) return
                let totalBuffer = verified[0].buffers + 1
                db.run(`UPDATE verifed SET walls=${totalBuffer} WHERE ign='${ign}'`)
                db.all(`SELECT * FROM verified ORDER BY walls ASC`,(err,leaderboard)=>{
                    if(err) return console.log(err)
                    for(i in leaderboard){
                        if(leaderboard[i].ign == ign){
                            let bufferEmbed = new Discord.MessageEmbed()
                            .setColor(maincolor)
                            .setTitle(`**Walls have been checked!**`)
                            .addField(`**Discord:**`,`<@${userDiscord}>`,true)
                            .addField(`**In game name:`,`\`${ign}\``,true)
                            .addField(`Checked at:`,`${getFormattedTime(new Date())}`,true)
                            .setDescription(`**Total checks:** ${totalAmount} - #${leaderboard[i]}`)
                            .setThumbnail(`https://minotar.net/helm/${ign}/190.png`)
                            bufferChannel.send(bufferEmbed)
                        }
                    }
                })
            }
        })
    });
}

function cooldown(user, type, lengthMS) {
if(!cooldowns[type]) {
    cooldowns[type] = {}
}

cooldowns[type][user] = {
    isValidCooldown : true,
    cooldownSet : new Date()
}

setTimeout(() => {
    cooldowns[type][user]["isValidCooldown"] = false
}, lengthMS)
}

function getRandomChars(amount) {
    let thing = []
    for(let i = 0; i < amount; i++) {
        let characters = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890`
        thing.push(characters[Math.floor(Math.random()*characters.length)])
    }

    return thing.join("")
}

function convertToPage(message, dataArray, page, title, entitiesPerPage) {
    let pageData = []
            let perPage;
            if(!entitiesPerPage || isNaN(entitiesPerPage)) perPage = 20
            else perPage = entitiesPerPage
            let numb1 = perPage/2

            let dataLength = dataArray.length
            let calc1 = Math.ceil(dataLength / numb1)
            let calc2 = calc1 * numb1
            let totalpages = math.round(`${eval(calc2 / perPage)}`)
            if(totalpages < 1) totalpages = 1
            let currentpage = 1
        
            if(!page || isNaN(parseInt(page))) currentpage = 1
            else currentpage = parseInt(page)
        
            if(currentpage > totalpages) currentpage = totalpages 
        
            if(currentpage == 1) {
            dataArray.forEach(player => {
                if(dataArray.indexOf(player) < perPage) {
                    pageData.push(`${player}`)
                }
            })
            }
            else {
                let newthing = dataArray.slice(eval(perPage*(currentpage-1)))
                newthing.forEach(player => {
                if(newthing.indexOf(player) < perPage) {
                    pageData.push(`${player}`)
                }
            })
        }


        let embed = new Discord.MessageEmbed()
        .setColor(maincolor)
        .setDescription(`${title}\nPage ${currentpage}/${totalpages}\n \n ${pageData.join("\n")}`)
        //.addField(title, `${pageData.join("\n")}`, true)
        .setTimestamp()
        .setTitle(title)
        if(dataArray.length === 0) return message.channel.send(new Discord.MessageEmbed().setColor(errorcolor).setDescription(`:x: An error occurred recieving/parsing the data`))
        //console.log(embed)
        message.channel.send(({ embeds: [embed] }))
}

function botMsg(chat) {
    if(chat.includes("Total server value:") || chat.toLowerCase().includes("server total")) {

    } else 
    if(chat.includes("$")) {
        if(chat.split(/ +/g).length > 8) return
        let ftopReplaced = chat.trim().split("Total server value:").join("").split("Total:").join("").split("$ ").join("").split("ServerTotal").join("")

        let ftopRaw = parseFTop(ftopReplaced)
        if(ftopRaw) {
            rawFTop.push(ftopRaw)
            timeOut = setTimeout(() => {
                if(ftopReadyToSend == false) return
                if(ftopMSG == undefined) return

                let fTop = reload(`./Data/ftop.json`)

                let ftopFactions = []
                let ftopValues = []

                rawFTop.forEach(element => {
                    let ftopSplit = element.split(/ +/)
                    let ftopValueNumber = parseInt(ftopSplit[2].replace(/[\$€£¥₩,]+/g, ""))
                    if(fTop[ftopSplit[1]]) {
                        let difference = ftopValueNumber - fTop[ftopSplit[1]]
                        fTop[ftopSplit[1]] = ftopValueNumber
                        ftopFactions.push(`**${ftopSplit[0]}** ${ftopSplit[1]}`)
                        ftopValues.push(`${ftopSplit[2]} \`[${ftopValueNumber < fTop[ftopSplit[1]] ? `-` : `+`}$${cn(Math.abs(difference))}]\``)
                    } else {
                        let difference = `N/A`
                        fTop[ftopSplit[1]] = ftopValueNumber
                        ftopFactions.push(`**${ftopSplit[0]}** ${ftopSplit[1]}`)
                        ftopValues.push(`${ftopSplit[2]} \`[${difference}]\``)
                    }
                    fs.writeFile(`./Data/ftop.json`, ``, (err) => {
                        fs.writeFile(`./Data/ftop.json`, JSON.stringify(fTop, null, 4), (err) => {});  
                    });   
                })

                let embed = new Discord.MessageEmbed()
                .setColor(maincolor)
                .setTitle(`Factions Top - \`${config["altinfo"]["serverIP"]}\``)
                .addField(`Faction`, ftopFactions.join("\n"), true)
                .addField(`Value`, ftopValues.join("\n"), true)
                .setFooter(`${config["altinfo"]["serverIP"]}`)
                .setTimestamp(new Date())

                ftopMSG.send(embed)
                rawFTop = []
                ftopMSG = undefined
            }, 250)
        }
    }

    if(fwhoReady == true) {
        fWhoData.push(chat)
        if(chat.includes(config["ingame_configs"]["fwho_stopArg"])) fwhoReady = false
        fwhoTimeout = setTimeout(() => {
            if(fwhoChannel == undefined) return
            for(let i = 0; i < fWhoData.length; i++) {
                let fwhoThing = fWhoData[i].split("***").join("⭑⭑⭑").split("**").join("⭑⭑").split("*").join("⭑").split("_").join("-")
                    if(fwhoThing.includes(": ")) {
                        fwhoThing = fwhoThing.split(": ").join(":** ")
                        fwhoThing = "**" + fwhoThing
                    }

                fWhoData[i] = fwhoThing
            }
            let cleanContent = fWhoData.join("\n")

            if(cleanContent.length < 2048) {
                let fWho = new Discord.MessageEmbed()
                .setColor(maincolor)
                .setTitle(`F Who:`)
                .setDescription(cleanContent)
                .setFooter(`${config["altinfo"]["serverIP"]}`)
                .setTimestamp(new Date())

                fwhoChannel.send(fWho)
                fWhoData = []
                fwhoReady = false
                fwhoChannel = undefined
            } else {
                let splitSections = []

                function cleanTheContent() {
                    splitSections.push(cleanContent.substr(0, 2048))
                    cleanContent = cleanContent.slice(0, 2048)
                }

                while(cleanContent.length > 2048) {
                    cleanTheContent()
                }

                let fWho = new Discord.MessageEmbed()
                .setColor(maincolor)
                .setTitle(`Factions Who`)
                .setDescription(splitSections[0])
                fwhoChannel.send(fWho)
                
                for(let i = 1; i < splitSections.length; i++) {
                    let newR = new Discord.MessageEmbed()
                    .setColor(maincolor)
                    .setDescription(splitSections[i])

                    if(i === splitSections.length-1) newR.setFooter(`${config["altinfo"]["serverIP"]}`).setTimestamp(new Date())
                    fwhoChannel.send(newR)
                }

                fWhoData = []
                fwhoReady = false
                fwhoChannel = undefined
            }
        }, 250)
    }
                
    if(rotateCheck == true){
            fWhoOnlineData.push(chat)

            if(chat.includes(config["ingame_configs"]["fwho_stopArg"])) rotateCheck = false
            fwhoOnlineTimeout = setTimeout(() => {

                let availablePlayers = []
                let onlinePlayers = []
                for(let i in bot.players) {availablePlayers.push(i)}

                fWhoOnlineData.forEach(ee => {
                    if(ee.includes(config["ingame_configs"]["fwho_stopArg"])) return fWhoOnlineData.splice(fWhoOnlineData.indexOf(ee), fWhoOnlineData.length-1)
                    let split = ee.split(/\ +/g)

                    for(let i = 0; i < split.length; i++) {
                        let replaced = split[i].replace(/[\*\+\-\ \,✯\➎\➍\➌\➋\➊]+/g, "").replace(/[,***]+/, "").replace(/\*+/, "")
                        if(availablePlayers.includes(replaced) && !onlinePlayers.includes(`${replaced}`)) rotatePlayers.push(`${replaced}`);
                    }
                })
            },300)
    }

    if(fwhoOnlineReady == true) {
        fWhoOnlineData.push(chat)
        if(chat.includes(config["ingame_configs"]["fwho_stopArg"])) fwhoOnlineReady = false
        fwhoOnlineTimeout = setTimeout(() => {
            if(fwhoOnlineChannel == undefined) return

            let availablePlayers = []
            let onlinePlayers = []
            for(let i in bot.players) {availablePlayers.push(i)}

            fWhoOnlineData.forEach(ee => {
                if(ee.includes(config["ingame_configs"]["fwho_stopArg"])) return fWhoOnlineData.splice(fWhoOnlineData.indexOf(ee), fWhoOnlineData.length-1)
                let split = ee.split(/\ +/g)

                for(let i = 0; i < split.length; i++) {
                    let replaced = split[i].replace(/[\*\+\-\ \,✯\➎\➍\➌\➋\➊]+/g, "").replace(/[,***]+/, "").replace(/\*+/, "")
                    if(availablePlayers.includes(replaced) && !onlinePlayers.includes(`${replaced}`)) onlinePlayers.push(`${replaced}`)
                }
            })

            if(onlinePlayers.length == 0)  {fwhoOnlineChannel.send(new Discord.MessageEmbed()
            .setColor(errorcolor)
            .setDescription(`:x: There is no one online in ${fOnlineFac}`))
            }else if(onlinePlayers.length == 1) 
            {let fwho = new Discord.MessageEmbed()
            .setColor(maincolor)
            .setDescription(`There is __${onlinePlayers.length}__ player online in ${fOnlineFac}: **${onlinePlayers}** `)
            fwhoOnlineChannel.send(fwho);
            }
            else {
                let fWho = new Discord.MessageEmbed()
                .setColor(maincolor)
                .setDescription(`There are __${onlinePlayers.length}__ players online in ${fOnlineFac}: **${onlinePlayers.join(", ")}** `)
                .setTimestamp(new Date())
    
                fwhoOnlineChannel.send(fWho);
            }

            fWhoOnlineData = []
            fwhoOnlineReady = false
            fwhoOnlineChannel = undefined
            fOnlineFac = undefined
        }, 300)
    }


    



    if(flistReady == true) {
        // FLIST func
        let tempData = chat.replace( /[()\\\/]/g, " " )
        tempData = tempData.replace(/[:,-]+/g, '');
        tempData = tempData.replace(/\ +/g," ")

        if(!tempData.includes('Power')) return
        
        flistSplit = tempData.split(" ")
        flistFacs.push(`**${flistSplit[0]}**`+`\`[${flistSplit[1]}|${flistSplit[2]}]\``)
        flistLand.push(`${flistSplit[7]} claims`)
        flistPMP.push(`${flistSplit[8]} | ${flistSplit[9]}`)

        flistData.push(tempData)

        flistTimeout = setTimeout(() => {
            if(flistChannel == undefined) return

            let fWho = new Discord.MessageEmbed()
            .setColor(maincolor)
            .setTitle(`Factions List`)
            .addField(`**Faction:**`,`${flistFacs.join("\n")}`,true)
            .addField(`**Claims:**`,`${flistLand.join("\n")}`,true)
            .addField(`**Power | Max:**`,`${flistPMP.join("\n")}`,true)
            .setFooter(`${config["altinfo"]["serverIP"]}`)
            .setTimestamp(new Date())

            flistChannel.send(fWho)
            flistData = []
            flistReady = false
            flistChannel = undefined
            flistFacs = []
            flistOn = []
            flistLand = []
            flistPMP = []

        }, 350)
    }

    if(forceReady == true) {
        forceData.push(chat)
        forceTimeout = setTimeout(() => {
            if(forceChannel == undefined) return

            let fWho = new Discord.MessageEmbed()
            .setColor(maincolor)
            .setTitle(`force`)
            .setDescription("```" + forceData.join("\n") + "```")
            .setFooter(`${config["altinfo"]["serverIP"]}`)
            .setTimestamp(new Date())

            forceChannel.send(fWho)
            forceData = []
            forceReady = false
            forceChannel = undefined
        }, 350)
    }

    if(balanceReady == true) {
        if(chat.includes("$")) {
            balanceData = chat
            let parseBal;
            if(balanceChannel == undefined) return
            balanceData = balanceData.split(' ')
            balanceData.forEach(split => {
                if(split.includes("$")){
                    parseBal = split
                }
            })
            let bal = new Discord.MessageEmbed()
            .setColor(maincolor)
            .setTitle(`:dollar:`)
            .setDescription(`**${balPerson}\'s balance:** ${parseBal}`)
            .setFooter(`${config["altinfo"]["serverIP"]}`)
            .setTimestamp(new Date())

            balanceChannel.send(bal)
            balanceData = undefined
            balanceReady = false
            balanceChannel = undefined
            balPerson = undefined
        }
    }

    if(balanceTopReady == true) {
        if(chat.includes("$")) {
            if(chat.includes("Server Total:")) {

            } else if(chat.includes("Server Total")) {

            } else {
                if(chat.split(/ +/g).length > 8) return
                let balReplaced = chat.split("Server Total").join("").split("Total:").join("").split("$ ").join("").split("ServerTotal").join("").replace(/\[([^\]]+)]/g, "").replace(/\(([^)]+)\)/g, "").split("*").join("").split("~").join("")
                let balRaw = parseFTop(balReplaced)
                if(balRaw) {
                    balanceTopData.push(balRaw)
                    timeOut = setTimeout(() => {
                        if(balanceTopReady == false) return
                        if(balanceTopChannel == undefined) return
        
                        let bTop = reload(`./Data/balancetop.json`)
        
                        let bTopUsers = []
                        let bTopValues = []
                        let bTopChange = []
        
                        balanceTopData.forEach(element => {
                            let balSplit = element.split(/ +/)
                            let ftopValueNumber = parseInt(balSplit[2].replace(/[\$€£¥₩,]+/g, ""))
                            if(bTop[balSplit[1]]) {
                                let difference = ftopValueNumber - bTop[balSplit[1]]
                                bTop[balSplit[1]] = ftopValueNumber
                                bTopUsers.push(`**${balSplit[0]} ${balSplit[1]}**`)
                                bTopValues.push(`${balSplit[2]} \`[${ftopValueNumber < bTop[balSplit[1]] ? `-` : `+`}$${cn(Math.abs(difference))}]\``)
                            } else {
                                let difference = `N/A`
                                bTop[balSplit[1]] = ftopValueNumber
                                bTopUsers.push(`**${balSplit[0]}** ${balSplit[1]}`)
                                bTopValues.push(`${balSplit[2]} \`[${difference}]\``)
                            }
                            fs.writeFile(`./Data/balancetop.json`, ``, (err) => {
                                fs.writeFile(`./Data/balancetop.json`, JSON.stringify(bTop, null, 4), (err) => {});  
                            });   
                        })
        
                        let embed = new Discord.MessageEmbed()
                        .setColor(maincolor)
                        .setTitle(`Balance Top - \`${config["altinfo"]["serverIP"]}\``)
                        .addField(`Users`, bTopUsers.join("\n"), true)
                        .addField(`Balance`, bTopValues.join("\n"), true)
                        .setFooter(`${config["altinfo"]["serverIP"]}`)
                        .setTimestamp(new Date())
        
                        balanceTopChannel.send(embed)
                        balanceTopData = []
                        balanceTopChannel = undefined
                        balanceTopReady = false
                    }, 60)
                }   
            }
        }
    }
}

function botEvent(mc) {
    let serverchatToSend = []

    setInterval(() => {
        if(serverchatToSend.length == 0) return

        let cfg = reload(configpath)

        if(!cfg["configuration"]) return
        else if(!cfg["configuration"]["Channels"]) return
        else if(!cfg["configuration"]["Channels"]["serverchatChannel"]) return
        if(!client.channels.cache.get(cfg["configuration"]["Channels"]["serverchatChannel"])) return
        let channel = client.channels.cache.get(cfg["configuration"]["Channels"]["serverchatChannel"])
        if(config["ingame_configs"]["ingame_features_isEnabled"] != true) return
        if(cfg["configuration"]["Switches"]["serverchat"] == false) return

        channel.send(`**\`${serverchatToSend.join("\n")}\`**`).then(() => {
            serverchatToSend = []
        }).catch(err => {
            
        })
    }, 2456)

    mc.on("message", async message => {
        
        let chat = `${message}`;

        let type;

        if(chat.includes("to your faction") || chat.includes("has been received from") || chat.includes("from your faction")) {
            if(chat.match(/(\$|€|£|¥|₩)[ ]*([1-9][0-9]*((,| )[0-9]{3})*|0)(\.[0-9]+)?[ ]*(B|b|M|m|K|k)?/g)) {
                let moneyAmount = chat.match(/(\$|€|£|¥|₩)[ ]*([1-9][0-9]*((,| )[0-9]{3})*|0)(\.[0-9]+)?[ ]*(B|b|M|m|K|k)?/g)[0]

                if(mc) {
                    if(mc.players != null) {
                        let players = [];
                        for(let i in mc.players) {players.push(i);}

                        let playersInMessage = [];

                        let msgSplit = chat.trim().split(/ +/g)
                        for(let i = 0; i < msgSplit.length; i++) {
                            for(let j = 0; j < players.length; j++) {
                                let currentPlayer = players[j];
                                if(msgSplit[i].includes(currentPlayer + ":")) return
                                if(msgSplit[i].includes(currentPlayer)) playersInMessage.push(currentPlayer)
                            }
                        }

                        if(playersInMessage.length > 1) return

                        let rawmoneyamount = parseInt(moneyAmount.replace(/[,$]+/g, ""))

                        if(config["ingame_configs"]["ingame_features_isEnabled"] != true) return
                        if(config["ingame_configs"]["ingame_bank"] != true) return
                        if(rawmoneyamount < config["ingame_configs"]["min_bank_deposit"]) return
 
                        let cfg = reload(configpath)
                        if(!cfg["configuration"]) return
                        if(!cfg["configuration"]["Channels"]) return
                        if(!cfg["configuration"]["Channels"]["bankChannel"]) return
                        let bankChannel = client.channels.cache.get(cfg["configuration"]["Channels"]["bankChannel"])
                        if(!bankChannel) return

                        if(chat.includes("to your faction") || chat.includes("has been received from")) type = "deposited"; else type = "withdrew"

                        let embed = new Discord.MessageEmbed()
                        .setColor(maincolor)
                        .setDescription(`:moneybag: **${playersInMessage[0]}** has ${type} $${cn(rawmoneyamount)}`)

                        bankChannel.send(embed)

                        let cgg = config["ingame_configs"]
                        if(cgg["ingame_features_isEnabled"] == true) {
                            if(cgg["bank_msgIngame"] == true) {
                                if(bot) {
                                    if(cfg["configuration"]) {
                                        if(cfg["configuration"]["Messages"]) {
                                            let msg = cfg["configuration"]["Messages"]["bankMsg"].replace(/\[type]/, type).replace(/\[ign]/, playersInMessage[0]).replace(/\[money]/, cn(rawmoneyamount))

                                            bot.chat(msg)
                                        }
                                    }
                                }
                            }
                        }
                           if(!chat.includes(chat.includes("from your faction"))) {
                        let pi = reload(userStatsPath)
                        let verified = reload(verifiedPath)

                        if(verified[playersInMessage[0]]) {
                            console.log(verified[playersInMessage[0]])
                            if(verified[playersInMessage[0]]["isVerified"] == false) return
                            if(pi[playersInMessage[0]]) {
                                    pi[playersInMessage[0]]["totalDeposited"] = pi[playersInMessage[0]]["totalDeposited"]+rawmoneyamount
                            }else pi[playersInMessage[0]] = {
                                totalDeposited : rawmoneyamount
                            }
                            fs.writeFile(userStatsPath, ``, (err) => {
                                        fs.writeFile(userStatsPath, JSON.stringify(pi, null, 2), (err) => {});  
                                });
                        }}
                    }
                }
            }
        }
    })

    mc.on("respawn", async b =>{

        mc.chat(config["altinfo"]["joinCMD"])
    })

    mc.on("message", async message => {
        let chat = `${message}`

        chat = chat.replace(/[\*\+\-\,✯\➎\➍\➌\➋\➊]+/g, "").replace(/[,***]+/, "").replace(/\*+/, "")

        let cfg = reload(configpath)

        if(!cfg["configuration"]) return
        else if(!cfg["configuration"]["Messages"]) return

        serverchatToSend.push(chat)
    })


    mc.on("login", () => {
        mc.chat(config["altinfo"]["joinCMD"])
        console.log(` \n    [${mc.username}] Starting to listen to events!\n `)
        setTimeout(() => {bot.chat("/f c f")}, 13000)
    })

    mc.on("kicked", async(reason) => {
        console.log(` \n    [${mc.username}] Kicked for ${reason}. Relogging in 20 seconds.\n `)
            mc.end()
    })

    mc.on("end", async() => {
        setTimeout(() => {
            bot = mineflayer.createBot(botReason)
            fs.writeFileSync('./bot', JSON.stringify(bot, null, 4));
            botEvent(bot)
        }, 20000)
    })


    mc.on("message", async(message) => {

        let chat = `${message}`

        botMsg(chat)

        if(config["ingame_configs"]["consoleChat"] == true) {
            let messageColor = []
        let fullMessage = ``
        if(message["extra"]) {
            message["extra"].forEach(ee => {
                messageColor.push([ee["color"], ee["text"]])
    
                let color = ee["color"]
                let text = ee["text"]

                switch(color) {
                    case "dark_red":
                        fullMessage = fullMessage + chalk.hex('#AA0000')(text)
                    break;
                    case "red":
                        fullMessage = fullMessage + chalk.hex('#FF5555')(text)
                    break;
                    case "gold":
                        fullMessage = fullMessage + chalk.hex('#FFAA00')(text)
                    break;
                    case "yellow":
                        fullMessage = fullMessage + chalk.hex('#FFFF55')(text)
                    break;
                    case "dark_green":
                        fullMessage = fullMessage + chalk.hex('#00AA00')(text)
                    break;
                    case "green":
                        fullMessage = fullMessage + chalk.hex('#55FF55')(text)
                    break;
                    case "aqua":
                        fullMessage = fullMessage + chalk.hex('#55FFFF')(text)
                    break;
                    case "dark_aqua":
                        fullMessage = fullMessage + chalk.hex('#00AAAA')(text)
                    break;
                    case "dark_blue":
                        fullMessage = fullMessage + chalk.hex('#0000AA')(text)
                    break;
                    case "blue":
                        fullMessage = fullMessage + chalk.hex('#5555FF')(text)
                    break;
                    case "light_purple":
                        fullMessage = fullMessage + chalk.hex('#FF55FF')(text)
                    break;
                    case "dark_purple":
                        fullMessage = fullMessage + chalk.hex('#AA00AA')(text)
                    break;
                    case "white":
                        fullMessage = fullMessage + chalk.hex('#FFFFFF')(text)
                    break;
                    case "gray":
                        fullMessage = fullMessage + chalk.hex('#AAAAAA')(text)
                    break;
                    case "dark_gray":
                        fullMessage = fullMessage + chalk.hex('#555555')(text)
                    break;
                    case "black":
                        fullMessage = fullMessage + chalk.hex('#000000')(text)
                    break;
                    default:
                            fullMessage = fullMessage + text
                }
            })

            console.log(fullMessage.replace(/§([0-9]|a|b|i|k|d|f|e|l|n|c|m|r|o)/gi, ""))
        } else {
            console.log(chat) 
        }

        }
    })

    mc.on("message", async msg => {
        let message = `${msg}`

        let verified = reload(verifiedPath)

        let cfg = reload(configpath)

        let users = []
        for(let i in mc.players) {users.push(i)}

        let splitmsg = message.split(/ +/g)

        let user
        
        for(let i = 0; i < splitmsg.length; i++) {
            if(users.includes(splitmsg[i].replace(/[:<>()+*✯-\➎\➍\➌\➋\➊]+/g, ""))) {
                user = splitmsg[i].replace(/[:<>()+*✯-\➎\➍\➌\➋\➊]+/g, "")
                userarg = i
                splitmsg[i] = splitmsg[i].replace(/[:<>()+*✯-\➎\➍\➌\➋\➊]+/g, "")
                break;
            }
        }

        if(user) {
            if(verified[user]) {
                if(verified[user]["verifyCode"]) {
                    if(verified[user]["isVerified"] == false) {
                        if(splitmsg.includes(verified[user]["verifyCode"])) {
                            mc.chat(`/msg ${user} ${user}, you have been verified with the bot!`)

                            verified[user]["isVerified"] = true

                            fs.writeFile(verifiedPath, ``, (err) => {
                                fs.writeFile(verifiedPath, JSON.stringify(verified, null, 2), (err) => {});  
                            });   
                        }
                    }

                    if(message.includes(prefix)) {
                    if(verified[user]["isVerified"] == true) {
                        let cmdMsg

                        for(let i = splitmsg.indexOf(user); i < splitmsg.length; i++) {
                            if(splitmsg[i].startsWith(prefix)) {
                                    cmdMsg = splitmsg.slice(i--)
                                    break;
                            }
                        }

                        if(cmdMsg) {
                            if(config["ingame_configs"]["ingameCommands_enabled"] == false) return
                            let args = cmdMsg
                            let cmd = args[0].slice(prefix.length).toLowerCase()
                            args = args.slice(1)
                            if(!cmd) return
                            
                            function ingameRes(igr){
                                let res = igr
                                return setTimeout(() => {mc.chat(res)}, config["ingame_configs"]["commandMessageDelay"])
                            }


                            function createResponse(ign, response) {
                                let res = config["ingame_configs"]["ingameCMDFormat"].split("[user]").join(ign).split("[response]").join(response)

                                return setTimeout(() => {mc.chat(res)}, config["ingame_configs"]["commandMessageDelay"])
                            }

                            if(cooldowns["defaultCmd"]) {
                                if(cooldowns["defaultCmd"][user]) {
                                    if(cooldowns["defaultCmd"][user]["isValidCooldown"] == true) {
                                        return createResponse(user, `You are currently on a cooldown - ${prettyMilliseconds(config["ingame_configs"]["ingameCommandCooldown"] - Math.abs(cooldowns["defaultCmd"][user]["cooldownSet"] - new Date(), {verbose: true}))} remaining`)
                                    }
                                }
                            }
                            cooldown(user, `defaultCmd`, config["ingame_configs"]["ingameCommandCooldown"])

                            if(cmd == "calc") {
                                if(!args.join(" ")) return createResponse(user, `You are missing some arguments - ${prefix}calc <calculation>`)

                                let calc = args.join(" ").replace(/x+/, "*")
                                if(calc.includes(":")) return createResponse(user, `I do not support ratios.`)

                                let evalaa = 0;
                                try {
                                        evalaa =eval(calc)
                                } catch(error) {
                                    return createResponse(user, `An error has occurred.`)
                                }
                                
                                createResponse(user, `${evalaa}`)
                            }

                            

                            if(cmd == "vanish"){
                                if(config["ingame_configs"]["vanish_ingame"] != true) return createResponse(user, `In-game vanish is disabled.`)
                                    mc.tabComplete(`/minecraft:tell `, (lol, match) => {
                                        let actualplayers = []
                                        match.forEach(mm => {
                                            if(mm == "@console") return
                                            
                                            else actualplayers.push(mm)
                                        })
    
                                        let vanishkids = []
    
                                        for(let i = 0; i < users.length; i++) {
                                            if(!users.includes(actualplayers[i])) vanishkids.push(actualplayers[i])
                                        }
    
                                        if(vanishkids.length == 0) return createResponse(user, `There is no one in vanish`)
                                        if(vanishkids.length == 1) return createResponse(user, `${vanishkids.join(", ")} is currently vanished`)
                                        createResponse(user, `${vanishkids.join(", ")} are currently in vanish`)
                                    }, false, false)
                                }



                            if(cmd == "invite"){
                               createResponse(user,`${user} has invited himself in the faction with ${prefix}invite!`)
                                setTimeout(() => {
                                    mc.chat(`/f inv ${user}`)
                                }, 700);
                                
                            }

                            if(cmd == "rotate"){
                                let valid=false;
                                let allP = reload(playtimepath)
                                let onlineP = []
                                if(!args[0]) return mc.chat(`/msg ${user} Enet player name that you want to rotate.`)
                                for(i in mc.players){
                                    onlineP.push(`${i}`)
                                }
                                let si = config["altinfo"]["serverIP"]
                                for(j in allP[si]){
                                    if(allP[si][args[0]]) valid = true;
                                }

                                    
                                    if(onlineP.includes(args[0])) {
                                        return mc.chat(`/msg ${user} can't rotate online players!`);

                                    }
                                    mc.chat(`/f who`)
                                    rotateCheck = true
                                    
                                    rotateTimeout = setTimeout(() => {
                                    if(rotatePlayers.includes(user)) {
                                        
                                        fWhoOnlineData = []
                                        rotateCheck = false
                                        fOnlineFac = undefined
                                        rotatePlayers = []
                                        return mc.chat(`/msg ${user} You are already in the faction!`)
                                    }
                                    if(!rotatePlayers.includes(user)){
                                            if(valid != true) return mc.chat(`/msg ${user} Enter a valid player name!`)
                                            if(users.includes(args[0])) ingameRes(`${args[0]} was rotated out for ${user}`)
                                            setTimeout(() => {
                                                mc.chat(`/f kick ${args[0]}`)
                                                setTimeout(() => {
                                                    mc.chat(`/f invite ${user}`)
                                                }, 1300);
                                                
                                            }, config["ingame_configs"]["commandMessageDelay"]);
                                            console.log(args[0], user)
                                            setTimeout(() => {
                                                rotateLog(args[0],user)
                                                rotateEmbed(args[0],user)
                                            }, 200);
                                            fWhoOnlineData = []
                                            rotateCheck = false
                                            fOnlineFac = undefined
                                            rotatePlayers = []
                                        }

                                    }, 700);
                                    
                                    

                                    
                                    
                            }

                            if(cmd == "help") {
                                createResponse(user, `Use ${prefix}help in ${client.guilds.get(config["Discord_Configs"]["main_guild"]).name} to view more commands`)
                            }

                            if(cmd == "playtime" || cmd == "pt") {
                                let ptf = reload(playtimepath)

                                let username
                                if(!args[0]) username = user
                                else username = args[0]
                    
                                let serverIP = config["altinfo"]["serverIP"]

                                if(!ptf[serverIP]) return createResponse(user, `No playtime data was found for this server`)

                                let playerpt;

                                let availablePlayers = []
                                let availablePlayersLC = []
                
                                for(let i in ptf[serverIP]) {availablePlayers.push(i); availablePlayersLC.push(i.toLowerCase())}
                
                                if(availablePlayersLC.includes(username.toLowerCase())) {
                                    playerpt = prettyMilliseconds((ptf[serverIP][availablePlayers[availablePlayersLC.indexOf(username.toLowerCase())]])*60*1000)
                                    username = availablePlayers[availablePlayersLC.indexOf(username.toLowerCase())]
                                }

                                if(playerpt == undefined) return createResponse(user, `${username} was not found in the playime database`)

                                createResponse(user, `${username} has ${playerpt} playtime`)
                            }


                            if(cmd == "checked") {
                                let conf = reload(configpath)
                                if(!conf["configuration"]) return
                                if(conf["configuration"]["Switches"]["wallChecks"] != true) return createResponse(user, `Wall Checks are currently disabled`)

                                if(cooldowns["wallCheck"]) {
                                    if(cooldowns["wallCheck"][message.author]) {
                                        if(cooldowns["wallCheck"][message.author]["isValidCooldown"] == true) {
                                            return createResponse(user, `You are currently on a cooldown! [${prettyMilliseconds(config["ingame_configs"]["wallCheckCooldown"] - Math.abs(cooldowns["wallCheck"][message.author]["cooldownSet"] - new Date(), {verbose: true}))} remaining]`)
                                        }
                                    }
                                }
                    
                                if(checkGracePeriod() == true && config["ingame_configs"]["fgrace_wallChecks"] == false) return createResponse(user, `The FGrace Period is currently enabled.`)
                                cooldown(message.author, `wallCheck`, config["ingame_configs"]["wallCheckCooldown"])

                                wallCheck(user)
                            }

                            if(cmd == "bchecked") {
                                let conf = reload(configpath)
                                if(!conf["configuration"]) return
                                if(conf["configuration"]["Switches"]["bufferChecks"] != true) return createResponse(user, `Buffer Checks are currently disabled`)

                                if(cooldowns["bufferCheck"]) {
                                    if(cooldowns["bufferCheck"][message.author]) {
                                        if(cooldowns["bufferCheck"][message.author]["isValidCooldown"] == true) {
                                            return createResponse(user, `You are currently on a cooldown! [${prettyMilliseconds(config["ingame_configs"]["bufferCheckCooldown"] - Math.abs(cooldowns["bufferCheck"][message.author]["cooldownSet"] - new Date(), {verbose: true}))} remaining]`)
                                        }
                                    }
                                }
                    
                                if(checkGracePeriod() == true && config["ingame_configs"]["fgrace_bufferChecks"] == false) return createResponse(user, `The FGrace Period is currently enabled.`)
                    
                                cooldown(message.author, `bufferCheck`, config["ingame_configs"]["bufferCheckCooldown"])

                                bufferCheck(user)
                            }


                            if(cmd == "weewoo"){
                                let conf = reload(configpath)
                                if(!conf["configuration"]) return
                                if(conf["configuration"]["Switches"]["wallChecks"] != true) return createResponse(user, `Wall Checks are currently disabled`)

                                if(cooldowns["wallCheck"]) {
                                    if(cooldowns["wallCheck"][message.author]) {
                                        if(cooldowns["wallCheck"][message.author]["isValidCooldown"] == true) {
                                            return createResponse(user, `You are currently on a cooldown! [${prettyMilliseconds(config["ingame_configs"]["wallCheckCooldown"] - Math.abs(cooldowns["wallCheck"][message.author]["cooldownSet"] - new Date(), {verbose: true}))} remaining]`)
                                        }
                                    }
                                }
                    
                                if(checkGracePeriod() == true && config["ingame_configs"]["fgrace_wallChecks"] == false) return createResponse(user, `The FGrace Period is currently enabled.`)
                                cooldown(message.author, `wallCheck`, config["ingame_configs"]["wallCheckCooldown"])
                                
                                if(weewooIsEnabled = true) {
                                    weewooIsEnabled = false; 
                                    await client.channels.cache.get(conf["configuration"]["Channels"]["wallChannel"]).send({embed: new Discord.MessageEmbed().setColor(0x229a11).setDescription(`:white_check_mark: Was stopped by <@${verified[user]["Discord"]}>`).setTimestamp(new Date())})}
                                else{
                                    weewooIsEnabled = true;
                                    weeWoo(user)

                                }
                                

                            }
                        }
                    }}
                }
            }
        }
    })
}

function parseFTop(message) {
    let _ = message
    if(_.match(/([+-]?[0-9]+(?:\.[0-9]*)?)/g)) {
        if(_.match(/([^#a-z0-9])\w+/g)) {
            if(_.match(/(\$|€|£|¥|₩)[ ]*([1-9][0-9]*((,| )[0-9]{3})*|0)(\.[0-9]+)?[ ]*(B|b|M|m|K|k)?/g)) {
                return `${_.match(/([+-]?[0-9]+(?:\.[0-9]*)?)/g)[0]} ${_.match(/([^#a-z0-9])\w+/g)[0]} ${_.match(/(\$|€|£|¥|₩)[ ]*([1-9][0-9]*((,| )[0-9]{3})*|0)(\.[0-9]+)?[ ]*(B|b|M|m|K|k)?/g)[0]}`
            }
        }
    } else return null
}

function getRole(message, role) {

    let rolea = role.replace("<@&","").replace(">","")
    let realrole = message.guild.roles.cache.get(rolea)
    if(realrole) return realrole
    else return false
}

function getFormattedTime(date) {
    return moment(date).format(`MM/DD/YYYY | hh:mm:ss a`)
}

function reload(file) {
    delete require.cache[require.resolve(file)];
    return require(file);
}

function getPerms(message) {
    let _pp = reload(permpath)
    let permissions = []
        message.member.permissions.toArray().forEach(perm => {
            permissions.push(perm)
        })

        message.member.roles.cache.forEach(role => {
            if(_pp[role.id]) {
                for(var i in _pp[role.id]["permissions"]) {
                    if(_pp[role.id]["permissions"][i] == false) {}
                    else permissions.push(i)
                }
            }
         })

        if(_pp[message.author.id]) {
            for(let i in _pp[message.author.id]["permissions"]) {
                if(_pp[message.author.id]["permissions"][i] == false) {}
                else permissions.push(i)
            }
        }

        return permissions
}

//
// BOT EVENTS
//
  client.login(config["Discord_Configs"]["discord_token"]).catch(err => {
    console.log(` \n[ERROR] The discord_token you provided in the config was not able to login to Discord!\n `)
    process.exit(1)
  })

client.on("ready", async() => {
    client.user.setPresence({ activities: [{ name: `${config["altinfo"]["serverIP"]} | ${prefix}help`}], status: 'idle' });
    let servers = []
    //getDiscBotName();
    client.guilds.cache.forEach((guild) => {
        if(guild.channels.size == 0) return servers.push(`  - ${guild.name} [${guild.id}] - No channels in this guild`)
        //let channel = client.channels.cache.get(guild.id).filter(channels => channels.type == "text")[0]
        //var channel = guild.channels.cache.filter(channel.type === 'text');
        var channel = guild.channels.cache.filter(chx => chx.type === "GUILD_TEXT").find(x => x.position === 0);
        if(!channel) {
            return servers.push(`  - ${guild.name} [${guild.id}] - No channels in this guild (can't make invite)`)
        } else {
            channel.createInvite({maxAge:0}, `Bot Booting up - Created invite`).then(inv => {
                servers.push(`  - ${guild.name} [${guild.id}] - ${inv}`)
            })
        }
    ///client.user.setPresence({ game: { name: `${config["altinfo"]["serverIP"]} | ${prefix}help`}}); 
    //client.user.setPresence({ game: { name: "hello"}}); 
    })

    setTimeout(async() => {consoleLogStart(); discordLogIn()},3000)

async function consoleLogStart() {

console.log((`\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n
    
    
         {-----Ur Mother-----} 
         {-----CosmicCrow-----} 
         {---------ZMLbot_Dev--------}


    [*] client has logged into ${client.user.tag}.

    [*] Discord servers:
    ${servers.join("\n    - ")}`))
    console.log('\n\n')


}
})


function discordLogIn() {
if(config["ingame_configs"]["ingame_features_isEnabled"] == true) {
    bot = mineflayer.createBot(botReason);
    fs.writeFileSync('./bot', JSON.stringify(bot, null, 4));
    
    bot.on("login", async() => {
        console.log("    "+chalk.black.bgWhite(`Running ${config["altinfo"]["joinCMD"]}`))
        setTimeout(()=>{bot.chat(config["altinfo"]["joinCMD"])},250)

        setTimeout(() => {bot.chat("/f c f")}, 8000)

        botEvent(bot)

        let rl = readline.createInterface({
            input: process.stdin
        });


          rl.on('line', (input) => {
            console.log(`[SENDING] -> ${input}`)
            bot.chat(input)
          })


    })} else console.log(`    `+chalk.red.bold(`ingame_features_isEnabled is set to false in the config, all ingame features are disabled.`))

    let ci = {}

    client.on("messageCreate", async(message) => {
        function errorm(err, syntax) {
            let embed = new Discord.MessageEmbed()
            .setColor(errorcolor)
            .setDescription(`:warning: Error \n\`${err}\`\n \n**Syntax:** \`\`\`${prefix}${syntax}\`\`\``)
            message.channel.send(({ embeds: [embed] }))
        }
        
        function m(msg) {
            let embed = new Discord.MessageEmbed()
            .setColor(maincolor)
            .setDescription(`:white_check_mark: ${msg}`)
        
            message.channel.send(({ embeds: [embed] }))
        }

        function v(msg,amount) {
            let embed = new Discord.MessageEmbed()
            .setColor(maincolor)
            .setDescription(`**🕵️ \u00BB __${amount}__:**\n${msg}`)
        
            message.channel.send(({ embeds: [embed] }))
        }
        
        function errm(err) {
            let embed = new Discord.MessageEmbed()
            .setColor(errorcolor)
            .setDescription(`:x: ${err}`)
        
            message.channel.send(({ embeds: [embed] }))
        }

        if(message.channel.type == "dm") return
        if(message.author.bot) return
        if(!config["Discord_Configs"]["allowed_guilds"].includes(message.guild.id) && message.guild.id != config["Discord_Configs"]["main_guild"]) return
        if(!message.content.startsWith(prefix)) return;
        let msgsplit = message.content.split(/ +/g);
        let cmd = msgsplit[0].slice(prefix.length).toLowerCase()
        args = msgsplit.slice(1)
        let arglc = msgsplit.slice(1).join(" ").toLowerCase().split(/ +/g)

        let cc = reload(configpath)
        if(cc["Blacklisted_Users"][message.channel.id]) {
            if(cc["Blacklisted_Users"][message.channel.id]["isBlocked"] == true) {
                if(!message.member.permissions.has("ADMINISTRATOR")) {
                    if(cmd == "apply") {
                        if(message.channel.id !== cfg["configuration"]["Channels"]["applyChannels"]) {
                            return errm(`${message.channel} is blacklisted!.`)
                        }
                    } else return errm(`${message.channel} is blacklisted!`)
                }
            }
        } else {
            if(cc["Blacklisted_Users"][message.author.id]) {
                if(cc["Blacklisted_Users"][message.author.id]["isBlocked"] == true) {
                if(!message.member.permissions.has("ADMINISTRATOR")) {
                    return errm(`You are currently blacklisted!`)
                }
            }}
        }

        if(cooldowns["clientmd"]) {
            if(cooldowns["clientmd"][message.author.id]) {
                if(cooldowns["clientmd"][message.author.id]["isValidCooldown"] == true) {
                    return errm(`You are currently on a cooldown - ${prettyMilliseconds(config["ingame_configs"]["clientommandCooldown"] - Math.abs(cooldowns["clientmd"][message.author.id]["cooldownSet"] - new Date(), {verbose: true}))} remaining.`)
                }
            }
        }
        if(cmd) {
            cooldown(message.author.id, `clientmd`, config["ingame_configs"]["clientommandCooldown"])
        }

        if(cmd == "help") {
            let page;
            if(args[0]) page = isNaN(args[0]) ? 1 : parseInt(args[0])
            else page = 1
            let cmds = [
                "**help [page]** Display help menu",
                "**botinfo** bots info",
                "**serverinfo** serevr info ",
                "**userinfo <user>** user info display",
                "**calc* [math]* usefull for calculations",
                "**avatar [user]** displays persons avatar",
                "**members [role]** displays members with certain role",
                "**poll [option1 | option2 | ...]** make a poll for voting",
                "**embed [-t title, -d description, -f footer]** make an embed",
                "**config <module> <option>** configure the bot thru discord",
                "**permission <u/r> <user/role> <permission>** grant/remove permissions for user/role",
                "**ban <user> [reason]** ban a member",
                "**unban <user>** unban a member",
                "**kick <user> [reason]** kicks a member",
                "**activitycheck [time in hours]** creates an activity check",
                "**reactcheck** check reactions on last activity check",
                "**setpaypal <paypal>** verified users can add paypal for themselfs",
                "**paypal <list/user>** check paypals",
                "**vanish** check vanished people (some servers patched it)",
                "**withdraw <amount>** withdraw money from bot",
                "**mute <member> [-t time]** mute a member",
                "**unmute <member>** unmute a member",
                "**clear <#>** clear x amount of chat messages",
                "**nickname <user> [nick]** give a nickname",
                "**role <user> [roles seperated by ,]** give/remove roles from user",
                "**relog** relogs the bot to the server",
                "**restart** restarts the bot",
                "**mention <role name>** mention a role",
                "**announce <announcment>** make a announcement in discord",
                "**ftop [page]** get ftop list from the server",
                "**fwho [faction]** get fwho info from the server",
                "**fonline [faction]** get online members in specifed factions/s",
                "**rotate <user>** rotate users thru discord",
                "**flist [page]** get flist info from the server",
                "**force <command>** for a bot to type or say something",
                "**balance <user>** check users balance",
                "**baltop [page]** request baltop from the server",
                "**playtimetop [server] [page]** get a player time top list",
                "**playtime <IGN>** get a playtime for user",
                "**playerlist [page]** get online players on server",
                "**dmall <role name> <message>** send a message to all people with certain role",
                "**uptime** gets bots uptime",
                "verify <IGN>** verify yourself with the bot",
                "**unverify <user/IGN>** unverify a user",
                "**rotatelist** get a rotate list from player server",
                "**blacklist <user/channel>** blacklist a channel or user from using commands",
                "**grace** set a grace",
                "**roster <user/list>** get faction roster",
                "**add <user> [roles seperated by ,]** add a member to faction roster + faction",
                "**promote <user> role_to_give,roles_to_remove** promote a member",
                "**demote <user> role_to_give,roles_to_remove** demote a member",
                "**remove <user> [roles seperated by ,]** remove member from faction",
                "**lock [channel]** lock a channel",
                "**unlock [channel]** unlock a channel",
                "**checked** checks walls",
                "**bchecked** checks buffers",
                "**stats <user>** shows stats for user",
                "**walls** get last walls/buffers last check",
                "**ctop [page]** checks top list",
                "**btop [page]** buffer checks top list",
                "**dtop [page]** deposits top list",
                "**weewoo <start/stop>** sets off a weewoo",
                ];

                convertToPage(message, cmds, page,`Help menu`, 15)
        }




        if(cmd == "botinfo") {
            let cmds = []
            for(let i in ci) {cmds.push(i)}

            let embed = new Discord.MessageEmbed()
            .setColor(maincolor)
            .setDescription(`**Discord bot connected:** ${client.user.tag}\n**Commands: ${cmds.length}**\n**Version:** 2.0.5\n\nMade by: <@650431108370137088> and <@304870309779996672>`)
            .setThumbnail(client.user.avatarURL)

            message.channel.send(({ embeds: [embed] }))
        }

        if(cmd == "serverinfo" || cmd == "si") {
        let region;
        let sec;
        switch(message.guild.verificationLevel){
            case(0):
            sec = `None`
            break;
            case(1):
            sec = `Must have a verified e-mail`
            break;
            case(2):
            sec = `Must be registered for over 5 mins`
            break;
            case(3):
            sec = `(╯°□°）╯︵ ┻━┻) - Must be a member for over 10 mins`
            break;
            case(4):
            sec = `┻━┻ ミヽ(ಠ 益 ಠ)ﾉ彡 ┻━┻ - Must have a verified phone number connected`
            break;
        }

        switch(message.guild.region) {
            case(`brazil`):
            region = `Brazil :flag_br:`
            break;

            case(`us-south`):
            region = `US South :flag_us:`
            break;

            case(`us-east`):
            region = `US East :flag_us:`
            break;

            case(`us-west`):
            region = `US West :flag_us:`
            break;

            case(`us-central`):
            region = `US Central :flag_us:`
            break;

            case(`europe`):
            region = `Europe :flag_eu:`
            break;

            case(`hongkong`):
            region = `Hong Kong :flag_hk:`
            break;

            case(`india`):
            region = `India :flag_in:`
            break;

            case(`japan`):
            region = `Japan :flag_jp:`
            break;

            case(`russia`):
            region  = `Russia :flag_ru:`
            break;

            case(`singapore`):
            region = `Singapore :flag_sg:`
            break;

            case(`southafrica`):
            region = `South Africa :flag_za:`
            break;

            case(`sydney`):
            region = `Australia Sydney :flag_au:`
            break;
        }

//let embed = new Discord.MessageEmbed()
//.setColor(maincolor)
//.setThumbnail(message.guild.iconURL)
//.setAuthor(message.guild.name, message.guild.iconURL)
//.setDescription(`
//*__${message.guild.name}__*
//**Server Owner:* ${message.guild.owner}

//**General Server Information**
//Region: ${region}
//**Members:**
//Total: ${message.guild.memberCount}
//People: ${message.guild.members.filter(member => !member.user.bot).size}\n
//Bots: ${message.guild.members.filter(member => member.user.bot).size}\n
//**Security:** ${sec}
//**Discord Created:** ${moment(message.guild.createdAt).format("MM/DD/YYYY | hh:mm:ss a")}`)

//.setFooter(message.guild.name)

//message.channel.send(embed)
        }

        if(cmd == "userinfo" || cmd == "whois") {
            let userarg;
            if(!args[0]) {userarg = message.author.id} else {
                userarg = args[0].replace(/[<>@!#]+/g, "")
            }
            console.log(args[0])
            let guild = message.guild
            let user = guild.members.cache.get(userarg)
            //console.log(user)
            //console.log(message.author)
            if(!user) user = message.author

            let status;
            switch(user.presence.status) {
                case(`dnd`):
                status = `Do not Disturb`
                break;

                case(`online`):
                status = `Online`
                break;

                case(`idle`):
                status = `AFK`
                break;

                case(`offline`):
                status = `Offline`
                break;
            }

            let game = user.presence.game
            if(!game) game = `No presence set.`

 
            //console.log(guild.members.cache.get(user.id).roles.cache.length)
            let embed = new Discord.MessageEmbed()
            .setColor(maincolor)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`**Information about** ${user}\n \n\n__*Joined discord:*__ ${moment(user.createdAt).format(`MM/DD/YY YY | hh:mm:ss a`)}\n__Joined guild:__ ${moment(guild.members.cache.get(user.id).joinedAt).format(`MM/DD/YYYY | hh:mm:ss a`)}\n__ID:__ ${user.id}\n \n**Presence**\n__Status:__ ${status}\n__Activity:__ ${game}\n \n**Roles**  \n__Roles:__ ${guild.members.cache.get(user.id).roles.cache.map((role)=>role.toString())}`)
        
            message.channel.send(({ embeds: [embed] }))
        }

        if(cmd == "calc" || cmd == "calculate") {
            let calc = args.join("")
            if(!calc) return errorm(`Invalid arguments`, `calc <calculation>`)
            calc = calc.replace(/x/g, "*")

            if(calc.includes(":")) {
                let aas = new Discord.MessageEmbed()
                .setColor(maincolor)
                .setDescription(`\`\`\`RATIOS ARE DISALLOWED\`\`\``)
                .setTitle(`Calculation: ${calc}`)
                .setFooter(message.author.tag, message.author.displayAvatarURL()                )
                return message.channel.send(({ embeds: [aas] }))
            }

            let evala = "error ";
            try {
                    evala =eval(calc)
            } catch(error) {
                
                let ec = new Discord.MessageEmbed()
                .setColor(maincolor)
                .setDescription(`\`\`\`ERROR\`\`\``)
                .setTitle(`Calculation: ${calc}`)
                .setFooter(message.author.tag, message.author.displayAvatarURL())
                return message.channel.send(({ embeds: [ec] }))
                
            }

            let embed = new Discord.MessageEmbed()
            .setColor(maincolor)
            .setDescription(`\`\`\`${evala}\`\`\``)
            .setTitle(`Calculation: ${calc}`)
            .setFooter(message.author.tag, message.author.avatarURL)
            
            message.channel.send(({ embeds: [embed] }))
        }

        if(cmd == "av" || cmd == "avatar") {
            let userarg;
            if(!args[0]) {userarg = message.author.id} else {
                userarg = args[0].replace(/[<>@!#]+/g, "")
            }
            let user = await client.users.fetch(userarg)
            if(!user) user = message.author
            console.log(user)
            let embed = new Discord.MessageEmbed()
            //await Promise
            .setColor(maincolor)
            .setDescription(`**User:** ${user.username}\n**ID:** ${user.id}\n**Link:** `+"https://cdn.discordapp.com/avatars/"+user.id+"/"+user.avatar+".jpeg")
            .setImage(user.avatarURL)
            .setFooter(message.author.tag, message.author.avatarURL)

            message.channel.send(({ embeds: [embed] }))
        }

        if(cmd == "members") {
            let permCheck;
            if(getPerms(message).includes("zml.members")) permCheck = true; if(message.member.permissions.has("MANAGE_ROLES")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`MANAGE_ROLES\` or \`zml.members\` to use this command.`)

        let players = []

        let roleone = args.join(" ").split("-p")
        let role;
        let page;
        if(roleone[0]) role = roleone[0].replace("<@&","").replace(">", "")
        if(roleone[1]) page = roleone[1]
        //console.log(role)
        let roles1= [];
        let indexes = [];
            message.guild.roles.cache.forEach((Role) => {
            roles1.push(Role.name);
            indexes.push(Role.id)
        })

        if (!role) return errorm(`Invalid role name!`, `members <role name> [-p pagenumber]`)

        let match = sm.findBestMatch(role, roles1);
       
            
        
        let bestmatchtarget = match.bestMatch.target;
        //console.log(role)
        let realrole = message.guild.roles.cache.get(role)
       // let realrole = message.guild.roles.cache.find(r => r.id === toString(role));
        //console.log(realrole)
        if(!realrole) return errorm(`Invalid role name!`, `members <role name> [-p pagenumber]`)
        message.guild.roles.cache.get(realrole.id).members.forEach(member => {players.push(member)})
        
        convertToPage(message, players, page, `**__${players.length} members__** have the ${realrole} role.`)
        }

        if(cmd == "poll") {
            let permCheck;
            if(getPerms(message).includes("zmlpoll")) permCheck = true; if(message.member.permissions.has("MANAGE_GUILD")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`MANAGE_GUILD\` or \`zmlpoll\` to use this command.`)

            let totalquestions = args.join(" ")
            if(!totalquestions) return errorm(`Missing arguments`, `poll <poll questions separated by |>`)

            let questions = totalquestions.split(/\|+/g)

            let newquestions = []
            
            for(let i = 0; i < 9; i++) {
                if(!questions[i]) break;
                newquestions.push(`**${i+1}.** ${questions[i]}`)
            }

            let embed = new Discord.MessageEmbed()
            .setTitle(`Poll`)
            .setDescription(`${newquestions.join("\n")}`)
            .setFooter(`Poll created by: ` + message.author.tag, message.author.avatarURL)
            .setColor(maincolor)

            message.channel.send(({ embeds: [embed] })).then(mmb => {
                let emojis = ["\u0031\u20E3","\u0032\u20E3","\u0033\u20E3","\u0034\u20E3","\u0035\u20E3","\u0036\u20E3","\u0037\u20E3","\u0038\u20E3","\u0039\u20E3"]
                for(let i = 0; i < 9; i++) {
                    if(!newquestions[i]) break;
                       setTimeout(() => {
                       mmb.react(emojis[i])
                   }, (i+1)*1000)
                }
                
            })
        }

        if(cmd == "embed") {
            let permCheck;
            if(getPerms(message).includes("zml.embed")) permCheck = true; if(message.member.permissions.has("MANAGE_MESSAGES")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`MANAGE_MESSAGES\` or \`zml.embed\` to use this command.`)

            if(!message.content.toLowerCase().includes(`-`)) return errorm(`Missing arguments`, `embed <info> (-t title, -d description, -f footer)`)
            let argumentsa = args.join(" ")

            let embed = new Discord.MessageEmbed()
            .setColor(maincolor);

            let embedObjects = []

            let titlematch = argumentsa.match(/-t [\w !<>[\]\\@#$%^&*()_+={};:'"/?.>,<:`]+/g)
            if(titlematch) {
                embed.setTitle(titlematch[0].split(/ +/g).slice(1).join(" ").split("\\n").join("\n"))
                embedObjects.push(`t`)
            }

            let footermatch = argumentsa.match(/-f [\w !<>[\]\\@#$%^&*()_+={};:'"/?.>,<:`]+/g)
            if(footermatch) {
                embed.setFooter(footermatch[0].split(/ +/g).slice(1).join(" ").split("\\n").join("\n"))
                embedObjects.push(`f`)
            }

            let descmatch = argumentsa.match(/-d [\w !<>[\]\\@#$%^&*()_+={};:'"/?.>,<:`]+/g)
            if(descmatch) {
                embed.setDescription(descmatch[0].split(/ +/g).slice(1).join(" ").split("\\n").join("\n"))
                embedObjects.push(`d`)
            }

            if(embedObjects.length == 0) return errm(`There was an error parsing your arguments, or you didn't include the correct flags.`)
            message.channel.send(({ embeds: [embed] }))
            
        }

        if(cmd == "cnf" || cmd == "config") {
            fs.readFile(configpath, "utf8", (err, data) => {
                let set = JSON.parse(data);

                let permCheck;
                if(getPerms(message).includes("zml.config")) permCheck = true; if(getPerms(message).includes("zml.config")) permCheck = true; if(message.member.permissions.has("MANAGE_GUILD")) permCheck = true
                if(permCheck == undefined) return errm(`You require the permission \`MANAGE_GUILD\`or \`zml.config\` to use this command.`)

            function resetConfig(channel) {
             set["bot_setUp"] = true
             set["configuration"] = {
                 Channels : {
                    ftopChannel : channel,
                    serverchatChannel : channel,
                    joinleaveChannel : channel,
                    wallChannel : channel,
                    bufferChannel : channel,
                    bankChannel : channel,
                    rotateLogChannel : channel,
                    flistChannel : channel,
                    facAuditChannel : channel,
                    logChannel : channel,
                    annouceChannel : channel,
                    verificationChannel : channel,
                    membersChannel : channel,
                    vanishChannel : channel
                 },

                 Switches : {
                    autoFtop : true,
                    autoFlist : true,
                    facAudit : true,
                    serverchat : true,
                    wallChecks : true,
                    bufferChecks : true,
                    joinleave : true,
                    embedJoinLeave : true,
                    rotateLog : true,
                    vanish: true
                 },

                 Messages : {
                    rotateMsg : `:arrows_clockwise: [rUser] was rotated out for [user]`,
                    joinMsg : `:white_check_mark: Welcome to [server], [user]!`,
                    leaveMsg : `:x: [user_tag] has left the server.`,
                    wallMsg: `Walls haven't been checked for [minutes] minutes! type ${prefix}checked to checked them!`,
                    bufferMsg : `Buffers haven't been checked for [minutes] minutes! type ${prefix}checked to checked them!`,
                    wallCheckMsg : `Walls have been checked by [ign] - [total]`,
                    bufferCheckMsg : `Buffers have been checked by [ign] - [total]`,
                    weewooMsg : `WEEWOO We are being raided! WEEWOO`,
                    bankMsg : `MONEY : [ign] has just [type] $[money]!`,
                    wallTime : 15,
                    bufferTime : 30
                 }
             }

             fs.writeFile(configpath, ``, (err) => {
                fs.writeFile(configpath, JSON.stringify(set, null, 2), (err) => {});  
            });
            }
            
            let channelArray =["ftopChannel","serverchatChannel","joinleaveChannel","wallChannel","bufferChannel","bankChannel","rotateLogChannel","flistChannel",
            "facAuditChannel","logChannel","annouceChannel","verificationChannel","membersChannel","vanishChannel"]

            let booleanArray = ["autoFtop","autoFlist","facAudit","serverchat","wallChecks","bufferChecks","joinleave","embedJoinLeave","rotateLog","vanish"]

            let otherArray = ["rotateMsg","joinMsg","leaveMsg","wallMsg","bufferMsg","wallCheckMsg","bufferCheckMsg","weewooMsg","bankMsg"]


            let wallBufferTimeArray = ["wallTime","bufferTime"]

            if(!set["configuration"]) {
                resetConfig(message.channel.id)
                m(`Setting up the bot for this server! Please try the command again.`)
                return
                }

            function list() {
                let channels = []
                let boolean = []
                let other = []

                for(let i in set["configuration"]["Channels"]) {
                    let chan
                    if(message.guild.channels.cache.get(set["configuration"]["Channels"][i])) chan = message.guild.channels.cache.get(set["configuration"]["Channels"][i])
                    else chan = `${i} (Not a channel)`      
                    channels.push(`**${i}** - Set to ${chan}`)
                }
                for(let i in set["configuration"]["Switches"]) {
                    let boo
                    if(set["configuration"]["Switches"][i] == true) boo = true
                    else if(set["configuration"]["Switches"][i] == false) boo = false
                    else boo = true

                    // set["configuration"]["Switches"][i] = true
                    // fs.writeFile(configpath, ``, (err) => {
                    //     fs.writeFile(configpath, JSON.stringify(set, null, 2), (err) => {});  
                    // });

                    boolean.push(`**${i}** - Set to ${boo}`)
                }
                for(let i in set["configuration"]["Messages"]) {
                    if(otherArray.includes(i)) {
                        other.push(`**${i}** - \`${set["configuration"]["Messages"][i]}\``)
                    } else if(wallBufferTimeArray.includes(i)) {
                        other.push(`**${i}** - Set to **${set["configuration"]["Messages"][i]} ${set["configuration"]["Messages"][i] > 1 ? `minutes` : `minute`}**`)
                    }
                }
            
                let embed = new Discord.MessageEmbed()
                .setColor(maincolor)
                .setDescription(`**Syntax:** \`${prefix}${cmd} <module> <option>\``)
                .addField(`**Channels configs**`, channels.join("\n"),true)
                .addField(`**Switches**`, boolean.join("\n"),true)
                .addField(`**Messages config**`, other.join("\n"),true)
                .setAuthor(`Config - ${message.guild.name}`)

                message.channel.send(({ embeds: [embed] }))
            }

            if(!args[0]) return list()

            if(args[0].toLowerCase() == "list") return list()

            if(args[0].toLowerCase() == "reset") {
                if(!message.member.permissions.has(`ADMINISTRATOR`)) return errm(`You require the permission \`ADMINISTRATOR\` to preform this sub-command.`)

                if(!args[1]) return errorm(`Invalid sub arguments`, `${cmd} reset <guild id>`)
                if(args[1].toString() !== message.guild.id) return errorm(`Invalid sub arguments`, `${cmd} reset <guild id>`)

                resetConfig(message.channel.id)
                m(`Config is being reset!`)
            }


            if(channelArray.includes(args[0])) {
                if(!args[1]) return list()
                if(!set["configuration"]["Channels"][args[0]]) return errm(`\`${args[0]}\` is not a valid module to change!`)
                let channelToReplace = args[1].toString().replace(/[<>@#!]+/g, "")
                if(!channelToReplace) return errm(`There was an error parsing your channel.`)
                if(!message.guild.channels.cache.get(channelToReplace)) return errm(`Didn't find channel: \`${channelToReplace}\`.`)

                set["configuration"]["Channels"][args[0]] = channelToReplace
                m(`Changed ${args[0]} to ${message.guild.channels.cache.get(channelToReplace)}`)


            } else if(booleanArray.includes(args[0])) {
                if(!args[1]) return list()
                console.log(set["configuration"]["Switches"][`${args[0]}`])
                if(set["configuration"]["Switches"][`${args[0]}`] != false && set["configuration"]["Switches"][`${args[0]}`] != true) return errm(`\`${args[0]}\` is not a valid module to change!`)

                let bool
                if(args[1].toLowerCase() == "true") bool = true
                else if(args[1].toLowerCase() == "false") bool = false
                else return errm(`Valid switches: \`true / false\``)

                set["configuration"]["Switches"][args[0]] = bool
                m(`Changed ${args[0]} to ${bool}`)


            } else if(otherArray.includes(args[0])) {
                if(!args[1]) return list()
                if(!set["configuration"]["Messages"][args[0]]) return errm(`\`${args[0]}\` is not a valid module to change!`)

                set["configuration"]["Messages"][args[0]] = args.slice(1).join(" ")
                m(`Changed ${args[0]} to \`${args.slice(1).join(" ")}\``)


            } else if(wallBufferTimeArray.includes(args[0])) {
                if(!args[1]) return list()
                if(!set["configuration"]["Messages"][args[0]]) return errm(`\`${args[0]}\` is not a valid module to change!`)

                if(isNaN(parseInt(args[1]))) return errm(`You need to give a valid integer`)

                set["configuration"]["Messages"][args[0]] = parseInt(args[1])
                m(`Changed ${args[0]} to ${parseInt(args[1])}`)
            } else return list()

            fs.writeFile(configpath, ``, (err) => {
                fs.writeFile(configpath, JSON.stringify(set, null, 2), (err) => {});  
            });
        })
        }

        if(cmd == "permission" || cmd == "perm") {
            let permCheck;
            if(getPerms(message).includes("zml.perm")) permCheck = true; if(getPerms(message).includes("zml.permission")); if(message.member.permissions.has("ADMINISTRATOR")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`ADMINISTRATOR\`, \`zml.permission\` or \`zml.perm\` to use this command.`)

            fs.readFile(permpath, "utf8", (err, data) => {
                let _p = JSON.parse(data);
            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <r / u> <@user or ID | role name> <permissions>`)

            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <r / u> <@user or ID | role name> <permissions>`)

            if(args[0].toLowerCase() == "list") {
                if(!args[1]) {
                    let array = []

                    for(let i in ci) {
                    if(ci[i]["permission"]) {
                        ci[i]["permission"].forEach(permNode => {
                            if(permNode.startsWith(`zml.`)) {
                                if(array.includes(`**__${ci[i]["name"]}__ command:** \`${permNode}\``)) return
                                if(ci[i][`isAlias`]) {

                                } else array.push(`**__${ci[i]["name"]}__ command:** \`${permNode}\``)
                            }
                        })
                    }
                    }

                    if(array.length == 0) return errm(`An error has occurred getting the permission nodes.`)

                    let embed = new Discord.MessageEmbed()
                    .setTitle(`Permission Nodes`)
                    .setDescription(array.join("\n"))
                    .setColor(maincolor)

                    return message.channel.send(({ embeds: [embed] }))
                }

                let role1 = args[1].split(/\++/g).join(" ")
                        
               // let roles11 = [];
               // /let indexes1 = [];
                  //  message.guild.roles.cache.forEach((Role) => {
                //    roles11.push(Role.name);
               ///     indexes1.push(Role.id)
                //})
        
                //let match1 = sm.findBestMatch(role1, roles11);
                //let bestmatchtarget1 = match1.bestMatch.target;
                let rolea = message.guild.roles.get(role1.replace("<@&","").replace(">",""))

                let cleanedArgs = args[1].replace(/[<>@!#]+/g, "")
                if(message.guild.member.cache.fetch(cleanedArgs)) {
                    if(!_p[cleanedArgs]) return errm(`${message.guild.member.cache.fetch(cleanedArgs)} does not have any permissions set.`)

                    let array = []
                    let userperms = []
                    let _array = []
                    let lolxdarray = []

                    for(let i in _p[cleanedArgs]["permissions"]) {
                        if(_p[cleanedArgs]["permissions"][i] != true) { } else {
                            userperms.push(i)
                        }
                    }

                        for(let _i in ci) {
                            if(ci[_i]["permission"]) {
                                ci[_i]["permission"].forEach(permNode => {
                                    if(permNode.startsWith(`zml.`)) {
                                        if(ci[_i][`isAlias`]) {
        
                                        } else {
                                            _array.push(permNode)
                                            lolxdarray.push(ci[_i]["name"])
                                        }
                                    }
                                })
                            }
                        }

                        for(let i = 0; i < _array.length; i++) {
                            if(userperms.includes(_array[i])) {
                                array.push(`**__${lolxdarray[i]}__ command:** \`${userperms[userperms.indexOf(_array[i])]}\``)
                            }
                        }
                    

                    if(array.length == 0) return errm(`An error has occurred getting the permission nodes.`)

                    let embed = new Discord.MessageEmbed()
                    .setTitle(`Permission Nodes for ${message.guild.member.cache.fetch(cleanedArgs).user.tag}`)
                    .setDescription(array.join("\n"))
                    .setColor(maincolor)

                    return message.channel.send(({ embeds: [embed] }))
                } else {
                    if(!_p[rolea.id]) return errm(`${rolea} does not have any permissions set.`)

                    let array = []
                    let userperms = []
                    let _array = []
                    let lolxdarray = []

                    for(let i in _p[rolea.id]["permissions"]) {
                        if(_p[rolea.id]["permissions"][i] != true) { } else {
                            userperms.push(i)
                        }
                    }

                        for(let _i in ci) {
                            if(ci[_i]["permission"]) {
                                ci[_i]["permission"].forEach(permNode => {
                                    if(permNode.startsWith(`zml.`)) {
                                        if(ci[_i][`isAlias`]) {
        
                                        } else {
                                            _array.push(permNode)
                                            lolxdarray.push(ci[_i]["name"])
                                        }
                                    }
                                })
                            }
                        }

                        for(let i = 0; i < _array.length; i++) {
                            if(userperms.includes(_array[i])) {
                                array.push(`**__${lolxdarray[i]}__ command:** \`${userperms[userperms.indexOf(_array[i])]}\``)
                            }
                        }
                    

                    if(array.length == 0) return errm(`An error has occurred getting the permission nodes.`)

                    let embed = new Discord.MessageEmbed()
                    .setTitle(`Permission Nodes for ${rolea.name} role`)
                    .setDescription(array.join("\n"))
                    .setColor(maincolor)

                    return message.channel.send(({ embeds: [embed] }))
                }
            }

            if(args[0].toLowerCase() == "r") {
                if(!args[1]) return errorm(`Invalid arguments`, `${cmd} r <role name (spaces replaced by +)> <permissions>`)
                if(!args[2]) return errorm(`Invalid arguments`, `${cmd} r <role name (spaces replaced by +)> <permissions>`)

                let role = args[1].split(/\++/g).join(" ")
                let realrole = message.guild.roles.get(role.replace("<@&","").replace(">",""))
                if (!realrole) return errorm(`Invalid role`, `${cmd} <r / u> <@user or ID | role name> <permissions>`)
                if(!_p[realrole.id]) {
                    _p[realrole.id] = {
                        permissions : {}
                    }

                    setTimeout(() => {
                        _p[realrole.id]["permissions"][args[2]] = true
                        fs.writeFile(permpath, ``, (err) => {
                            fs.writeFile(permpath, JSON.stringify(_p, null, 2), (err) => {});  
                        });

                            m(`Added permission \`${args[2]}\` to ${realrole}`)
                        }, 1000)
                } else {
                    if(_p[realrole.id]["permissions"][args[2]]) {
                        _p[realrole.id]["permissions"][args[2]] = false
                        fs.writeFile(permpath, ``, (err) => {
                            fs.writeFile(permpath, JSON.stringify(_p, null, 2), (err) => {});  
                        });

                        m(`Removed permission \`${args[2]}\` from ${realrole}`)
                    } else {
                        _p[realrole.id]["permissions"][args[2]] = true
                        fs.writeFile(permpath, ``, (err) => {
                            fs.writeFile(permpath, JSON.stringify(_p, null, 2), (err) => {});  
                        });

                        m(`Added permission \`${args[2]}\` to ${realrole}`)
                    }
                }

            } else if(args[0].toLowerCase() == "u") {
                if(!args[1]) return errorm(`Invalid arguments`, `${cmd} u <@user or ID> <permissions>`)
                if(!args[2]) return errorm(`Invalid arguments`, `${cmd} u <@user or ID> <permissions>`)

                let user = args[1].replace(/[<>!@#]+/g, "")
                if(!message.guild.members.cache.get(user))return errorm(`Invalid user`, `${cmd} <u> <@user or ID> <permissions>`)
                user = message.guild.members.cache.get(user)

                if(!_p[user.id]) {
                    _p[user.id] = {
                        permissions : {}
                    }

                    setTimeout(() => {
                        _p[user.id]["permissions"][args[2]] = true
                        fs.writeFile(permpath, ``, (err) => {
                            fs.writeFile(permpath, JSON.stringify(_p, null, 2), (err) => {});  
                        });

                            m(`Added permission \`${args[2]}\` to ${user}`)
                        }, 1000)
                } else {
                    if(_p[user.id]["permissions"][args[2]]) {
                        _p[user.id]["permissions"][args[2]] = false
                        fs.writeFile(permpath, ``, (err) => {
                            fs.writeFile(permpath, JSON.stringify(_p, null, 2), (err) => {});  
                        });

                        m(`Removed permission \`${args[2]}\` from ${user}`)
                    } else {
                        _p[user.id]["permissions"][args[2]] = true
                        fs.writeFile(permpath, ``, (err) => {
                            fs.writeFile(permpath, JSON.stringify(_p, null, 2), (err) => {});  
                        });

                        m(`Added permission \`${args[2]}\` to ${user}`)
                    }
                }
            } else return errorm(`Invalid arguments`, `${cmd} <r / u> <@user or ID | role name> <permissions>`)

            fs.writeFile(permpath, ``, (err) => {
                fs.writeFile(permpath, JSON.stringify(_p, null, 2), (err) => {});  
            });
        })
        }

        if(cmd == "activityCheck" || cmd == "ac"){
            let permCheck;
            
            if(getPerms(message).includes("zml.activitycheck")) permCheck = true; if(message.member.permissions.has("ADMINISTRATOR")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`ADMINISTRATOR\` or \`zml.activitycheck\` to use this command.`)
            
            if(!args[0]) return errorm(`Invalid arguments`,`${cmd} <time in hours>`)

            let acMsg = reload(otherInfoPath)
            let embed = new Discord.MessageEmbed()
            .setTitle(`Activity Check`)
            .setDescription(`__**React below to confirm your activity!**__ \nTime: **${args[0]}h**`)
            .setFooter(`Faction Bot`)
            .setColor(maincolor)
            .setTimestamp(new Date())
            let mID;
            let cID = message.channel.id
            try {
                let re = await message.channel.send(({ embeds: [embed] }));
                re.react("✅");
                re.pin();
                mID = re.id;
            } catch(e) {
                // error message or something here-
            }
            console.log(mID)

            acMsg["reactionCheck"] = {
                "message": mID,
                "channel": cID
            }

            fs.writeFile(otherInfoPath, ``,(err)=>{
                fs.writeFile(otherInfoPath, JSON.stringify(acMsg, null, 2), (err) => {});
                console.log(`\n\nChanged activity message to: ${chalk.red(mID)}`)
            })
            
        }

        if(cmd == "rcheck" || cmd == "reactioncheck"){
            let permCheck;
            
            if(getPerms(message).includes("zml.reactcheck")) permCheck = true; if(message.member.permissions.has("ADMINISTRATOR")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`ADMINISTRATOR\` or \`zml.reactcheck\` to use this command.`)
            
            let rMessage = reload(otherInfoPath)
            let list = client.guilds.cache.get(config["Discord_Configs"]["main_guild"]);

            let rUsers = []
            let allMembers= []
            list.members.cache.forEach(member => {
                if(member.bot) return
                allMembers.push(member.id)
            }); 
            let page = isNaN(args[0]) ? 1 : parseInt(args[0])

            let msg = await client.channels.cache.get(rMessage["reactionCheck"]["channel"]).messages.fetch(`${rMessage["reactionCheck"]["message"]}`) 
            let users = await msg.reactions.cache.get("✅").users.fetch()

            // console.log(msg.reactions); // returns ReactionManager, you may map the cache collection
            users.map(u => {
                rUsers.push(u.id)
            })

            let notReacted = []
            allMembers.forEach(member =>{
                if(!rUsers.includes(member)){
                    notReacted.push(`<@${member}>`)
                }
            })
            convertToPage(message,notReacted,page,`Reaction Check`,20)
            
        }

        

        //PPwip
        if(cmd == "setpaypal" || cmd == "spp"){
            if(!args[0]) return errm(`Missing arguments`);

            let verifyDB = reload(verifiedPath)
            let verifu = []
            for(let x in verifyDB) {if(verifyDB[x]["isVerified"] == true) {verifu.push(verifyDB[x]["Discord"])}}
            if(!verifu.includes(message.author.id)) return errm(`You need to be verified with \`${prefix}verify\` to use this command.`)


            let pp = reload(payPal)
            let vuC = reload(verifiedPath)
            let cfg = reload(configpath)
            let dUser = message.member.id

            

            if(!args[0].includes(`@`)) return errorm(`Invalid arguments`, `setpaypal <email>`)
            let validigns = []
            let validignslc = []
            let discordids = []
            let ign = "";
            for(let i in vuC) {validigns.push(i); validignslc.push(i.toLowerCase()); discordids.push(vuC[i]["Discord"])}
            //GET IGN of a message author
            for(let j in vuC){

                if(vuC[j]["Discord"] == dUser){
                    if(vuC[j]["isVerified"] == true) {
                        ign = `${vuC[j]["playerName"]}`}
                        else{
                            return errm(`You must be verifed with the bot to set paypal.`)
                        }
                }
            }
            //If paypal exists::
            if(pp[ign]) return errm(`Paypal is already set. Ask guild administrator to change it.`);

            pp[ign]={
                "playerName":ign,
                "discord": message.member.id,
                "paypal": args[0]
            }
            console.log(`writing file`)
            fs.writeFile(payPal, ``,(err)=>{
                fs.writeFile(payPal, JSON.stringify(pp, null, 2), (err) => {});
                m(`Successfully added paypal *${args[0]}* to **${ign}**`)
            })
        }

        if(cmd == "paypal" || cmd == "pp"){
            let permCheck;
            
            if(getPerms(message).includes("zml.paypal")) permCheck = true; if(message.member.permissions.has("ADMINISTRATOR")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`ADMINISTRATOR\` or \`zml.paypal\` to use this command.`)
            let pp = reload(payPal)

            let paypalUsers = []
            for(i in pp){
                paypalUsers.push(pp[i]["playerName"])
            }
            console.log(paypalUsers)

            

            if(!args[0]) return m(`**Players avaible:**\n\n${paypalUsers.join(",\n")}\n\n \`${prefix}paypal <player>\``);
            let player = args[0]

            let dUser = message.author.tag

            if(!pp[player]) return errm(`User not found!`)

            let uPaypal = pp[player]["paypal"]

            let embed = new Discord.MessageEmbed()
                .setTitle(`PayPal:`)
                .setDescription(`**Player:**\n\`${player}\`\n\n**Paypal:** \n\`${uPaypal}\``)
                .setFooter(dUser,message.author.avatarURL)
                .setTimestamp()
                .setColor(maincolor)
            
            message.channel.send(({ embeds: [embed] }))


        }

        if(cmd == "vanish"){
            let users = []
            for(let i in bot.players) {users.push(i)}

            if(bot != null) {
                bot.tabComplete(`/minecraft:tell `, (lol, match) => {
                    let actualplayers = []
                    match.forEach(mm => {
                        if(mm == "@console") return
                        
                        else actualplayers.push(mm)
                    })

                    let vanishkids = []

                    for(let i = 0; i < users.length; i++) {
                        if(!users.includes(actualplayers[i])) vanishkids.push(actualplayers[i])
                    }

                    let amount = vanishkids.length <= 0 ? 0: vanishkids.length ;

                    if(vanishkids.length == 0) return v(`There is no one in vanish`, amount)
                    if(vanishkids.length == 1) return v(`**${vanishkids.join(", ")}** is currently vanished`, amount)
                    v(`**${vanishkids.join(", ")}** are currently in vanish`, amount)
                }, false, false)
            } else return message.channel.send(err(`The bot is not online!`))
        }


        if(cmd == "withdraw"){
            
            let permCheck;
            if(getPerms(message).includes("zml.withdraw")) permCheck = true; if(message.member.permissions.has("MANAGE_GUILD")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`MANAGE_GUILD\` or \`zml.withdraw\` to use this command.`)
            let onlineP = []
            let verifyDB = reload(verifiedPath)
            if(!args[0]) return errorm(`Invalid arguments`,`withdraw <amount>`)
            for(x in bot.players){
                onlineP.push(`${x}`)
            }
            bot.chat(`/f c f`)
            let pi = reload(userStatsPath)
            let cfg = reload(configpath)
            let ign;
            let money = parseInt(args[0])
            
            for(let j in verifyDB){
                if(verifyDB[j]["Discord"] == message.author.id){
                    ign = verifyDB[j]["playerName"]
                }
            }
            
            if(!onlineP.includes(`${ign}`)) return errm(`You must be on \`${config["altinfo"]["serverIP"]}\` to use this command!`)
            console.log(`${ign} : ${money}`)
            bot.chat(`/pay ${ign} ${money}`)
            let embed = new Discord.MessageEmbed().setDescription(`:moneybag: **${ign}** withdrew $${cn(money)}`).setColor(maincolor)
            let channel = message.guild.channels.cache.get(cfg["configuration"]["Channels"]["bankChannel"])
            channel.send(embed)

            if(pi[ign]){
                pi[ign]["totalDeposited"] = pi[ign]["totalDeposited"]-money
            }else{
                pi[ign]={
                    totalDeposited : Math.floor(0 - money)
                }
                
            }

            console.log(pi[ign]["totalDeposited"]+ " OBJ: " + pi[ign])

            fs.writeFile(userStatsPath, ``, (err) => {
                fs.writeFile(userStatsPath, JSON.stringify(pi, null, 2), (err) => {});  
            });
            let wM = cfg["configuration"]["Messages"]["bankMsg"]
            bot.chat(wM.split('[ign]').join(` ${ign} `).split(`[type]`).join(` withdrew `).split('[money]').join(`${cn(money)}`))
                
            
        }


        if(cmd == "clear") {
            let permCheck;
            if(getPerms(message).includes("zml.clear")) permCheck = true; if(message.member.permissions.has("MANAGE_MESSAGES")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`MANAGE_MESSAGES\` or \`zml.clear\` to use this command.`)
            
            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <# of messages>`)
            if(isNaN(parseInt(args[0]))) return errorm(`Invalid arguments`, `${cmd} <# of messages>`)
            if(parseInt(args[0]) > 100) return errm(`You can't clear more than 100 messages`)
            if(parseInt(args[0]) < 1) return errm(`You can't clear less than 1 message`)

            let title = `./Logs/ClearLog-${moment(new Date()).format(`MM_DD_YYYY hh_mm_ss_a`)}.txt`

            let msgG = message

            let number = parseInt(args[0])
            if(number > 100) number = 100
            if(number < 1) number = 1
            number = number+1

            let writeData = `Message clear - ${moment(new Date()).format(`MM/DD/YYYY hh:mm:ss a`)}\r\nChannel Name: ${message.channel.name}\r\nChannel ID: ${message.channel.id}\r\nModerator: ${message.author.tag} [${message.author.id}]\r\n \r\n`

            fs.writeFile(title, writeData, err => {
            })

            

            message.channel.messages.fetch({"limit":number}).then(messages => {
                let arr = []
                messages.forEach(mm => {arr.push(mm)})
                arr.reverse()
                arr.forEach(msg => {
                    let content = `\r\n${getFormattedTime(msg.createdAt)} | ${msg.author.tag}: ${msg.content}`
                    fs.writeFile(title, content, { flag: 'a+' }, (err) => {})
                })
                message.channel.bulkDelete(number).then(() => {
                    if(message.member.roles.cache.some(r=>[config["Discord_Configs"]["manager_roleName"]].includes(r.name))) return;
                    m(`Cleared ${number} messages`)
                    let cfg = reload(configpath)
                    if(cfg["configuration"]) {
                        if(cfg["configuration"]["Channels"]["logChannel"]) {
                            if(message.guild.channels.cache.get(cfg["configuration"]["Channels"]["logChannel"])) {
                                let logChannel = message.guild.channels.cache.get(cfg["configuration"]["Channels"]["logChannel"])
        
                                let logEmbed = new Discord.MessageEmbed()
                                .setColor(maincolor)
                                .setFooter(message.author.tag, message.author.avatarURL)
                                .setDescription(`**__Message Cleared__**\n \n**Cleared at:** ${getFormattedTime(new Date())}\n**Channel:** ${msgG.channel}\n**Messages Cleared:** ${number}`)
        
                                logChannel.send(logEmbed)
                                logChannel.send({file:title})
                            }
                        }
                    }
                })
            })
        }

        if(cmd == "nickname" || cmd == "nick") {
            let permCheck;
            if(getPerms(message).includes("zml.nick")) permCheck = true; if(getPerms(message).includes("zml.nickname")) permCheck = true; if(message.member.permissions.has("MANAGE_NICKNAMES")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`MANAGE_NICKNAMES\`, \`zml.nickname\` or \`zml.nick\` to use this command.`)
            
            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <@user or ID> <new nickname>`)

            let user = args[0].replace(/[<>!@#]+/g, "")
            if(!message.guild.members.cache.get(user)) return errorm(`Invalid user`, `${cmd} <@user or ID> <new nickname>`)
            user = message.guild.members.cache.get(user)

            let nickname = args.slice(1).join(" ")
            if(!nickname) return errorm(`Invalid arguments`, `${cmd} <@user or ID> <new nickname>`)

            let errr = false

            user.setNickname(nickname).catch(err => {
                errm(`An error has occurred changing ${user}'s nickname`)
                errr = true
            }).then(() => {setTimeout(() => {
                if(errr == true) return
                m(`${user}'s nickname has been changed to \`${nickname}\`!`)
            }, 500)})
        }

        if(cmd == "role") {
            
            let permCheck;
            if(getPerms(message).includes("zml.role")) permCheck = true; if(message.member.permissions.has("MANAGE_ROLES")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`MANAGE_ROLES\`, \`zml.role\` to use this command.`)
            
            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <@user or ID> <@role>`)

            let user = args[0].replace(/[<>!@#]+/g, "")
            if(!message.guild.members.cache.get(user)) return errorm(`Invalid user`, `${cmd} <@user or ID> <@role>`)
            user = message.guild.members.cache.get(user)

            if(!args.slice(1).join(" ")) return errorm(`Invalid arguments`, `${cmd} <@user or ID> <@role>`)

            let role = args.slice(1).join(" ").replace("<@&","").replace(">", "")
            let realrole = message.guild.roles.cache.get(role)
            if(!realrole) return errorm(`Invalid arguments`, `${cmd} <@user or ID> <@role>`)

            if(realrole.position >= user.roles.highest.position) return errm(`${realrole} is higher than its highest role (${user.roles.highest})`)
            
            if(user.roles.cache.has(realrole.id)) {
                user.roles.remove(realrole).catch(err => {

                }).then(() => {
                    m(`Removed ${realrole} from ${user}`)
                })
            } else {
                user.roles.add(realrole).catch(err => {

                }).then(() => {
                    m(`Added ${realrole} to ${user}`)
                })
            }
        }

        if(cmd == "rlog" || cmd == "rotatelog"){
            let permCheck
            if(getPerms(message).includes("zml.rotatelog")) permCheck = true; if(message.member.permissions.has("ADMINISTRATOR")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`ADMINISTRATOR\`, \`zml.rotatelog\` to use this command.`)
            
            if(!fs.existsSync(`./rotate/rotateLOG${config["altinfo"]["serverIP"]}.txt`, () => {})) return errm(`There was no logs found for  \`rotations\``)

            if(fs.existsSync(`./rotate/rotateLOG${config["altinfo"]["serverIP"]}.txt`, () => {})) {
                fs.readFile(`./rotate/rotateLOG${config["altinfo"]["serverIP"]}.txt`, (err, data) => {
                    let dd = data.toString()

                let stats = fs.statSync(`./rotate/rotateLOG${config["altinfo"]["serverIP"]}.txt`)
                let fileSizeInBytes = stats.size

                let messageslength = dd.split("\r\n").length
                let fzs = numeral(fileSizeInBytes).format(`0.0 b`)

                let embed = new Discord.MessageEmbed()
                .setColor(maincolor)
                .setDescription(`\`\`\`Rotate Log\`\`\`\n \n**Total roations**: *${messageslength}*\n**Filesize**: *${fzs}*`)
                .setTimestamp(new Date())

                message.channel.send(({ embeds: [embed] })).then(() => {
                    message.channel.send({file:`./rotate/rotateLOG${config["altinfo"]["serverIP"]}.txt`})
                    })
                })
            }
        }

        
        if(cmd == "restart") {
            let permCheck;
            if(getPerms(message).includes("zml.restart")) permCheck = true;
            if(permCheck == undefined) return errm(`You require the permission \`zml.restart\` to use this command.`)

            require('child_process').exec("/restart.bat", function (err, stdout, stderr) {
                if (err) {

                    return console.log(err);
                }
                console.log(stdout);
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            m(`**Restarting the bot!** `)
            setTimeout(() => {
                process.exit()
            }, 200)
        }

        if(cmd == "mention") {
            let permCheck;
            if(getPerms(message).includes("zml.mention")) permCheck = true; if(message.member.permissions.has("MANAGE_ROLES")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`MANAGE_ROLES\` or \`zml.mention\` to use this command.`)

            if(!args.join(" ")) return errorm(`Invalid arguments`, `${cmd} <role>`)
            let role = args.join(" ")

            let theRole = getRole(message, role)
            if(theRole == false) return errorm(`Invalid role`, `${cmd} <role>`)

            theRole.setMentionable(true, `Mention Command`).then(updatedRole => {
                message.channel.send(`<@&${theRole.id}>`).then(() => {
                    updatedRole.setMentionable(false, `Mention Command`)
                })
            })
        }

        if(cmd == "getsslink" || cmd == "ss") {
            if(!message.member.voiceChannel) return errm(`You're not in a voice channel!`)

            message.channel.send(({ embeds: [new Discord.MessageEmbed().setColor(maincolor).setDescription(`:white_check_mark: [Click to join the Screen Share!](https://discordapp.com/channels/${message.guild.id}/${message.member.voiceChannelID})`)] }))
        }

        if(cmd == "announce") {
            let permCheck;
            if(getPerms(message).includes("zml.announce")) permCheck = true; if(message.member.permissions.has("MANAGE_MESSAGES")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`MANAGE_MESSAGES\` or \`zml.announce\` to use this command.`)
            let cfg = reload(configpath)
            if(!args.join(" ")) return errorm(`Invalid arguments`, `announce <announcement>`)
            if(!message.client.channels.cache.get(cfg["configuration"]["Channels"]["annouceChannel"])){
                message.channel.send(`@everyone`).then((ma) => {ma.delete()})
                
                message.channel.send(new Discord.MessageEmbed().setColor(maincolor).setTitle(`Announcement`).setDescription(`${args.join(" ")}`).setFooter(message.author.tag, message.author.avatarURL).setTimestamp(new Date()))
            }else{
                chan = await message.client.channels.cache.get(cfg["configuration"]["Channels"]["annouceChannel"])
                chan.send(`@everyone`).then((ma) => {ma.delete()})
                chan.send({ embeds: [new Discord.MessageEmbed().setColor(maincolor).setTitle(`Announcement`).setDescription(`${args.join(" ")}`).setFooter(message.author.tag, message.author.avatarURL).setTimestamp(new Date())] })
            }
        }

        if(cmd == "ftop") {
            if(config["ingame_configs"]["ingame_features_isEnabled"] !== true) return errm(`\`ingame_features_isEnabled\` is currently disabled!`)
            if(config["ingame_configs"]["ftop_enabled"] !== true) return errm(`\`ftop_enabled\` is currently disabled!`)
            
            let ftopNum = 1
            if(args[0]) {
                if(!isNaN(parseInt(args[0]))) {
                    ftopNum = parseInt(args[0])
                }
            }
            bot.chat(config["ingame_configs"]["ftopCMD"].split("[num]").join(ftopNum))
            ftopMSG = message.channel
            rawFTop = []
            ftopReadyToSend = true
            ftopStillSending = false
        }

        if(cmd == "fwho" || cmd == "show") {
            if(config["ingame_configs"]["ingame_features_isEnabled"] !== true) return errm(`\`ingame_features_isEnabled\` is currently disabled!`)
            if(config["ingame_configs"]["fwho_enabled"] !== true) return errm(`\`fwho_enabled\` is currently disabled!`)

            if(!args.join(" ")) return errorm(`Invalid arguments`, `${cmd} <faction or player>`)
            bot.chat(`/f who ${args.join(" ")}`)
            fWhoData = []
            fwhoReady = true
            fwhoChannel = message.channel
        }

        if(cmd == "fonline") {
            if(config["ingame_configs"]["ingame_features_isEnabled"] !== true) return errm(`\`ingame_features_isEnabled\` is currently disabled!`)
            if(config["ingame_configs"]["fwho_online_enabled"] !== true) return errm(`\`fwho_online_enabled\` is currently disabled!`)

            if(!args.join(" ")) return errorm(`Invalid arguments`, `${cmd} <faction or player>`)
            bot.chat(`/f who ${args.join(" ")}`)
            fWhoOnlineData = []
            fwhoOnlineReady = true
            fwhoOnlineChannel = message.channel
            fOnlineFac = args.join(" ")
        }


        if(cmd == "rotate"){
            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <@user | ID>`)
            let user = args[0].replace(/[<>!@#]+/g, "")
            if(!message.guild.member.cache.fetch(user)) return errorm(`Invalid arguments`, `${cmd} <@user or ID>`)
            user = message.guild.member.cache.fetch(user)
            let cfg = reload(configpath)
            let vuC = reload(verifiedPath)
            let allP = reload(playtimepath)
            if(config["ingame_configs"]["ingame_features_isEnabled"] !== true) return errm(`\`ingame_features_isEnabled\` is currently disabled!`)
            if(config["ingame_configs"]["rotations"] !== true) return errm(`\`rotations\` are disabled.`)
            let invPerson = message.author.id;
            let invPlayer;
            if(!args.join(" ")) return errorm(`Invalid arguments`, `${cmd} <@user>`)
            let ign;
            
            // 
            let onlineP = []
            for(i in bot.players){
                onlineP.push(`${i}`)
            }
            //TEST CODE
            let validigns = []
            let validignslc = []    
            let discordids = []
            
            for(let i in vuC) {validigns.push(i); validignslc.push(i.toLowerCase()); discordids.push(vuC[i]["Discord"])}
            for(let j in vuC){
                if(vuC[j]["Discord"] == invPerson){
                    if(vuC[j]["isVerified"] != true) return errm(`${message.author} you must be verified to use this command.`)
                    ign = `${vuC[j]["playerName"]}`
                }
            }
            if(!onlineP.includes(`${ign}`)) return errm(`You must be on \`${config["altinfo"]["serverIP"]}\` to use that!`)
            invPlayer = ign;
            let valid = false
            let si = config["altinfo"]["serverIP"]
            for(j in allP[si]){
                if(allP[si][invPlayer]) valid = true;
            }
            
            //get rotate person
            let index;
            if(validignslc.indexOf(args[0].toLowerCase())) index = validignslc.indexOf(args[0].toLowerCase())
            if(index == -1) {
                if(discordids.indexOf(args[0].replace(/[<>!@#]+/g, ""))) index = discordids.indexOf(args[0].replace(/[<>!@#]+/g, ""))
            }
        
            if(index == -1) return errm(`There was no IGN or Discord found in the database with that search term.`)
            if(onlineP.includes(validigns[index])){ return errm(`Can\'t rotate online members!`)}
            bot.chat(`/f who`)
            rotateCheck = true
            
            rotateTimeout = setTimeout(() => {
            if(rotatePlayers.includes(user)) {
                
                fWhoOnlineData = []
                rotateCheck = false
                fOnlineFac = undefined
                rotatePlayers = []
                return bot.chat(`/msg ${user} You are already in the faction!`)
            }
            if(!rotatePlayers.includes(user)){
                    if(valid != true) return errm(`The player you are trying to rotate has not been found in player base.`)
                    if(onlineP.includes(args[0])) bot.chat(`${validigns[index]} was rotated out for ${invPlayer}`)
                        setTimeout(() => {
                            //KICK PERSON
                            setTimeout(() => {
                                bot.chat(`/f kick ${validigns[index]}`)
                                setTimeout(() => {
                                    bot.chat(`/f inv ${invPlayer}`)
                                }, 1500);
                            }, 500);
                            if(cfg["configuration"]){
                                if(cfg["configuration"]["Channels"]){
                                    if(cfg["configuration"]["Channels"]["rotateLogChannel"]) rotateLog(validigns[index], ign); return rotateEmbed(validigns[index],ign)
                                }
                            }else errm(`Bot wasn't set up yet!`)
                    }, 200);
                    fWhoOnlineData = []
                    rotateCheck = false
                    fOnlineFac = undefined
                    rotatePlayers = []
                }

            }, 700);


            
            
            
            
        }



        if(cmd == "flist") {
            if(config["ingame_configs"]["ingame_features_isEnabled"] !== true) return errm(`\`ingame_features_isEnabled\` is currently disabled!`)
            if(config["ingame_configs"]["flist_enabled"] !== true) return errm(`\`flist_enabled\` is currently disabled!`)

            bot.chat(config["ingame_configs"]["flistCMD"])
            flistData = []
            flistReady = true
            flistChannel = message.channel
        }

        if(cmd == "force") {
            let permCheck;
            if(getPerms(message).includes("zml.force")) permCheck = true; if(message.member.permissions.has("ADMINISTRATOR")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`ADMINISTRATOR\` or \`zml.force\` to use this command.`)

            if(config["ingame_configs"]["ingame_features_isEnabled"] !== true) return errm(`\`ingame_features_isEnabled\` is currently disabled!`)
            if(config["ingame_configs"]["force_enabled"] !== true) return errm(`\`force_enabled\` is currently disabled!`)

            if(!args.join(" ")) return errorm(`Invalid arguments`, `force <command>`)

            if(!bot) return errm(`The bot is currently not online.`)

            bot.chat(`${args.join(" ")}`)
            forceData = []
            forceReady = true
            forceChannel = message.channel
        }


        if(cmd == "balance" || cmd == "bal") {
            if(config["ingame_configs"]["ingame_features_isEnabled"] !== true) return errm(`\`ingame_features_isEnabled\` is currently disabled!`)
            if(config["ingame_configs"]["balance_enabled"] !== true) return errm(`\`balance_enabled\` is currently disabled!`)

            if(!args.join(" ")) return errorm(`Invalid arguments`, `${cmd} <player>`)

            bot.chat(`/bal ${args.join(" ")}`)
            balanceData = undefined
            balanceReady = true
            balanceChannel = message.channel
            balPerson = args.join(" ")
        }

        if(cmd == "baltop") {
            if(config["ingame_configs"]["ingame_features_isEnabled"] !== true) return errm(`\`ingame_features_isEnabled\` is currently disabled!`)
            if(config["ingame_configs"]["baltop_enabled"] !== true) return errm(`\`baltop_enabled\` is currently disabled!`)
            
            let balNum = 1
            if(args[0]) {
                if(!isNaN(parseInt(args[0]))) {
                    balNum = parseInt(args[0])
                }
            }
            bot.chat(config["ingame_configs"]["baltopCMD"].split("[num]").join(balNum))
            balanceTopChannel = message.channel
            balanceTopData = []
            balanceTopReady = true
        }

        if(cmd == "playtimetop" || cmd == "pttop") {
            let ptf = reload(playtimepath)

            let server
            if(!args[0]) server = config["altinfo"]["serverIP"]
            else server = args[0]

            let page = 1
            if(args[1]) {
                if(!isNaN(parseInt(args[1]))) {
                    page = parseInt(args[1])
                }
            }

            if(!ptf[server]) return errm(`There is no data on ${server}`)

            let data = []
            for(let i in ptf[server]) {
                data.push([i, (ptf[server][i]*60*1000)])
            }

            data = data.sort((a, b) => {return a[1] - b[1]}).reverse()

            for(let i = 0; i < data.length; i++) {
                data[i] = `\`${data[i][0]}\` - **${prettyMilliseconds(data[i][1])}**`
            }

            convertToPage(message, data, page, `__**${data.length} players**__ in the playtime database (\`${server}\`)`)
        }

        if(cmd == "playtime" || cmd == "pt") {
            let ptf = reload(playtimepath)

            if(!args[0]) return errorm(`Invalid username`, `playtime <IGN>`)

            let username = args[0]

            let servers = []
            let playersPlaytime = []

            for(let i in ptf) {
                servers.push(i)
            }

            servers.forEach(element => {
                let availablePlayers = []
                let availablePlayersLC = []

                for(let i in ptf[element]) {availablePlayers.push(i); availablePlayersLC.push(i.toLowerCase())}

                if(availablePlayersLC.includes(username.toLowerCase())) {
                    playersPlaytime.push(`**${element}**: ${prettyMilliseconds((ptf[element][availablePlayers[availablePlayersLC.indexOf(username.toLowerCase())]])*60*1000)}`)
                }
            })

            if(playersPlaytime.length == 0) return errm(`This player is not in the database`)

            let embed = new Discord.MessageEmbed()
            .setColor(maincolor)
            .setTitle(`Playtime results for ${username}`)
            .setDescription(`${playersPlaytime.join("\n")}`)

            message.channel.send(({ embeds: [embed] }))
        }

        if(cmd == "playerlist" || cmd == "players") {
            let onlinePlayers = []

            if(!bot) return errm(`The bot is not online`)

            let page = 1
            if(args[0]) {
                if(!isNaN(parseInt(args[0]))) {
                    page = parseInt(args[0])
                }
            }

            if(!bot) return errm(`The bot is not online`)

            for(let i in bot.players) {
                onlinePlayers.push(`\`${i}\``)
            }

            convertToPage(message, onlinePlayers, page, `__**${onlinePlayers.length} players**__ are currently online on **\`${config["altinfo"]["serverIP"]}\`**`)
        }

        if(cmd == "dmall") {
            let permCheck;
            if(getPerms(message).includes("zml.dmall")) permCheck = true; if(message.member.permissions.has("ADMINISTRATOR")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`ADMINISTRATOR\` or \`zml.dmrole\` to use this command.`)

            if(!args[0]) return errorm(`Invalid arguments`, `dmrole <role> <message>`)
            if(!args.slice(1).join(" ")) return errorm(`Invalid arguments`, `dmrole <role> <message>`)

            let roleName = args[0].split(/\++/g).join(" ")

            let role = getRole(message, roleName)
            if(role == false) return errm(`There was an error looking finding the specified role.`)

            //let members = message.guild.roles.cache.get(role.id).members.map.filter(m => !m.user.bot)

            let embed = new Discord.MessageEmbed()
            .setColor(maincolor)
            .setDescription(`**DM from ${message.author.username}**\n \n${args.slice(1).join(" ")}\n**Sent At:** ${getFormattedTime(new Date())}\n**By:** ${message.author}`)
            .setTimestamp(new Date())
            .setFooter(`${config["altinfo"]["serverIP"]}`)

            message.guild.roles.cache.get(role.id).members.filter(m => !m.user.bot).forEach(member => {
                member.send(({ embeds: [embed] }))
            })

            m(`Sent the message \`${args.slice(1).join(" ")}\` to the all members with ${role}!`)
        }

        if(cmd == "uptime") {
            m(`The bot has been online for **${prettyMilliseconds(client.uptime, {verbose: true})}**`)
        }

        if(cmd == "verify") {
            let cfgC = reload(configpath)
            let vuC = reload(verifiedPath)

            if(cfgC["configuration"]["Channels"]["verificationChannel"] !== message.channel.id) return errm(`This command can only be ran in ${message.guild.channels.cache.get(cfgC["configuration"]["Channels"]["verificationChannel"])}`)

            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <IGN>`)

            if(!bot) return errm(`The bot must be online so you can verify`)

            let playerListLC = []
            let playerList = []
            for(let i in bot.players) {playerListLC.push(i.toLowerCase()); playerList.push(i)}

            if(!playerListLC.includes(args[0].toLowerCase()) && bot) return errm(`You must be on \`${config["altinfo"]["serverIP"]}\` to do this command!`)

            let playerName = playerList[playerListLC.indexOf(args[0].toLowerCase())]

            let code = `${getRandomChars(17)}-${getRandomChars(15)}--${getRandomChars(5)}`

            let embed = new Discord.MessageEmbed()
            .setColor(maincolor)
            .setDescription(`**Verify**\n \`/msg ${bot.username} ${code}\`\n \n:warning: Being nicknamed on the server might affect the verification process.`)

            message.author.send(embed)
            m(`**${playerName}**,\nMessage **${bot.username}** on \`${config["altinfo"]["serverIP"]}\` the code I sent you to verify your account.`)
            
            vuC[playerName] = {
                "playerName" : playerName,
                "Discord" : message.author.id,
                "verifyCode" : code,
                "isVerified" : false
            }

            fs.writeFile(verifiedPath, ``, (err) => {
                fs.writeFile(verifiedPath, JSON.stringify(vuC, null, 2), (err) => {});  
            });   
        }

        if(cmd == "unverify") {
            let permCheck;
            if(getPerms(message).includes("zml.unverify")) permCheck = true; if(message.member.permissions.has("ADMINISTRATOR")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`ADMINISTRATOR\` or \`zml.unverify\` to use this command.`)

            let vuC = reload(verifiedPath)

            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <IGN | @user or ID>`)

            let validigns = []
            let validignslc = []
            let discordids = [""]

            for(let i in vuC) {validigns.push(i); validignslc.push(i.toLowerCase()); discordids.push(vuC[i]["Discord"])}

            let index;
            if(validignslc.indexOf(args[0].toLowerCase())) index = validignslc.indexOf(args[0].toLowerCase())
            if(index == -1) {
                if(discordids.indexOf(args[0].replace(/[<>!@#]+/g, ""))) index = discordids.indexOf(args[0].replace(/[<>!@#]+/g, ""))
            }

            if(index == -1) return errm(`There was no IGN or Discord found in the database with that search term.`)

            m(`Removing ${validigns[index]} from the database`)

            delete vuC[validigns[index]]

            fs.writeFile(verifiedPath, ``, (err) => {
                fs.writeFile(verifiedPath, JSON.stringify(vuC, null, 2), (err) => {});  
            });   
        }

        if(cmd == "rotatelist") {
            let permCheck;
            if(getPerms(message).includes("zml.rotatelist")) permCheck = true; if(message.member.permissions.has("ADMINISTRATOR")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`ADMINISTRATOR\` or \`zml.rotatelist\` to use this command.`)

            let rr = reload(RRPath)

            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <IGN>`)

            if(args[0].toLowerCase() == "list") {
                let toRotate = []
                for(let i in rr) {
                    if(rr[i]["isRotatable"] == true) toRotate.push(`\`${i}\``)
                }

                if(toRotate.length == 0) return errm(`There is no players that can be rotated`)

                let page = 1
                if(!args[1] || isNaN(parseInt(args[1]))) page = 1 
                else page = parseInt(args[1])

                let player = `players`
                if(toRotate.length == 1) player = `player`

                return convertToPage(message, toRotate, page, `There is __**${toRotate.length} ${player}**__ who can be rotated`)
            }

            if(!bot) return errm(`The bot must be online so you can verify`)

            let playerListLC = []
            let playerList = []
            for(let i in bot.players) {playerListLC.push(i.toLowerCase()); playerList.push(i)}

            if(!playerListLC.includes(args[0].toLowerCase())) return errm(`\`${args[0]}\` must be on \`${config["altinfo"]["serverIP"]}\` to do this command!`)

            let playerName = playerList[playerListLC.indexOf(args[0].toLowerCase())]

            if(!rr[playerName] || rr[playerName]["isRotatable"] == false) {
                rr[playerName] = {
                    isRotatable : true
                }

                m(`\`${playerName}\` is now rotatable with the ingame rotate command`)
            } 
            
            else if(rr[playerName]["isRotatable"] == true) {
                rr[playerName] = {
                    isRotatable : false
                }

                 m(`\`${playerName}\` is no longer rotatable with the ingame rotate command`)
            }

            fs.writeFile(RRPath, ``, (err) => {
                fs.writeFile(RRPath, JSON.stringify(rr, null, 2), (err) => {});  
            });   
        }

        if(cmd == "blacklist") {
            let permCheck;
            if(getPerms(message).includes("zml.blacklist")) permCheck = true; if(message.member.permissions.has("MANAGE_GUILD")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`MANAGE_GUILD\` or \`zml.blacklist\` to use this command.`)
            let cf = reload(configpath)
            if(args[0]) {
                let user = args[0].replace(/[<>!@#]+/g, "")
                if(!message.guild.members.cache.get(user)) {
                    if(message.guild.channels.cache.get(user)) {
                        return blacklistChannel(user)
                    } else return blacklistChannel(message.channel.id)
                }
                user = message.guild.members.cache.get(user)

                blacklist(user.user.id)
            } else blacklistChannel(message.channel.id)

            function blacklist(person) {
                if(cf["Blacklisted_Users"][person]) {
                    if(cf["Blacklisted_Users"][person]["isBlocked"] == true) {
                        cf["Blacklisted_Users"][person]["isBlocked"] = false
                        m(`${message.guild.member.cache.get(person)} has been un blacklisted from using bot commands`)
                    } else {
                        cf["Blacklisted_Users"][person]["isBlocked"] = true
                        m(`${message.guild.member.cache.get(person)} has been blacklisted from using bot commands`)
                    }
                } else {
                    cf["Blacklisted_Users"][person] = {
                    "isBlocked":true
                }
                m(`${message.guild.members.cache.get(person)} has been blacklisted from using bot commands`)
            }

            fs.writeFile(configpath, ``, (err) => {
                fs.writeFile(configpath, JSON.stringify(cf, null, 2), (err) => {});  
            });
            }

            function blacklistChannel(channel) {
                    if(!cf["Blacklisted_Users"][channel]) {
                        m(`Bot commands can no longer be ran in ${client.channels.cache.get(channel)}`)
                        cf["Blacklisted_Users"][channel] = {
                            "isBlocked":true
                        }
                    } else {
                        if(cf["Blacklisted_Users"][channel]["isBlocked"] == true) {
                            m(`Bot commands can now be ran in ${client.channels.cache.get(channel)}`)
                            cf["Blacklisted_Users"][channel]["isBlocked"] = false
                        }else {
                            m(`Bot commands can no longer be ran in ${client.channels.cache.get(channel)}`)
                            cf["Blacklisted_Users"][channel]["isBlocked"] = true
                        }
                    }

                fs.writeFile(configpath, ``, (err) => {
                    fs.writeFile(configpath, JSON.stringify(cf, null, 2), (err) => {});  
                });
        }
        }



        if(cmd == "grace" || cmd == "armistice" || cmd == "shield" || cmd == "forcefield") {
            let permCheck;
            if(getPerms(message).includes("zml.grace")) permCheck = true; if(message.member.permissions.has("MANAGE_GUILD")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`MANAGE_GUILD\` or \`zml.grace\` to use this command.`)

            let gcfg = reload(configpath)

            if(args[0]) {
                if(args[0].toLowerCase() == "disable") {
                    if(gcfg["fGrace_Period"]["disabled"] == true) return errm(`The grace period is already disabled`)

                    m(`The grace period for the bot has been disabled`)

                    gcfg["fGrace_Period"]["disabled"] = true
                    fs.writeFile(configpath, ``, (err) => {
                        fs.writeFile(configpath, JSON.stringify(gcfg, null, 2), (err) => {});  
                    });

                    return
                }

                if(args[0].toLowerCase() == "enable") {
                    if(gcfg["fGrace_Period"]["disabled"] == false) return errm(`The grace period is already enabled`)

                    m(`The grace period for the bot has been enabled`)

                    gcfg["fGrace_Period"]["disabled"] = false
                    fs.writeFile(configpath, ``, (err) => {
                        fs.writeFile(configpath, JSON.stringify(gcfg, null, 2), (err) => {});  
                    });

                    return
                }

                if(args[0].toLowerCase() == "info") {
                    m(`The grace period is currently set to start at **${gcfg["fGrace_Period"]["timeStart"]} ${momenttz.tz(momenttz.tz.guess()).zoneName()}** and end at **${gcfg["fGrace_Period"]["timeEnd"]} ${momenttz.tz(momenttz.tz.guess()).zoneName()}** for a total length of ${gcfg["fGrace_Period"]["length"]} hours\n \nThe current time is **${moment(new Date()).format(`HH:mm`)} ${momenttz.tz(momenttz.tz.guess()).zoneName()}**`)

                    return
                }
            }

            let split = args.join(" ").split(/\|+/g)

            if(!split[0] || !split[1]) return errorm(`Invalid arguments`, `${cmd} <hour start - 24hr time | disable> | <length in hours>`)

            if(isNaN(parseInt(split[0])) || isNaN(parseInt(split[1]))) return errm(`One of your times is invalid! Here's an example: \`${prefix}${cmd} 20 | 6\` This will start at 8am (20:00) amd last until 2am (02:00)`)

            let number1 = parseInt(split[0])
            let number2 = parseInt(split[1])

            if(number1 > 23 || number1 < 0) return errm(`You have entered an invalid starting hour`)
            if(number2 > 23 || number2 < 1) return errm(`You have entered an invalid length`)

            let timeStart = number1
            if(timeStart < 10) timeStart = `0${timeStart}:00`
            else timeStart = `${timeStart}:00`

            let endingHour = number1+number2
            if(endingHour > 24) endingHour = endingHour - 24
            if(endingHour < 10) endingHour = `0${endingHour}:00`
            else endingHour = `${endingHour}:00`

            m(`The grace period for the bot has been set to start at **${timeStart} ${momenttz.tz(momenttz.tz.guess()).zoneName()}** and last for **${number2} hours (Ends at ${endingHour} ${momenttz.tz(momenttz.tz.guess()).zoneName()})**`)

            gcfg["fGrace_Period"] = {
                "disabled" : false,
                "timeStart": timeStart,
                "timeEnd": endingHour,
                "length": number2
            }

            fs.writeFile(configpath, ``, (err) => {
                fs.writeFile(configpath, JSON.stringify(gcfg, null, 2), (err) => {});  
            });
        }

        if(cmd == "roster") {
            let permCheck;
            if(getPerms(message).includes("zml.roster")) permCheck = true; if(message.member.permissions.has("ADMINISTRATOR")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`ADMINISTRATOR\` or \`zml.roster\` to use this command.`)

            let rr = reload(RRPath)

            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <@user or ID | list>`)

            if(args[0].toLowerCase() == "list") return rosterList()

            let user = args[0].replace(/[<>!@#]+/g, "")
            if(!message.guild.members.cache.get(user)) return errorm(`Invalid arguments`, `${cmd} <@user or ID | list>`)
            user = message.guild.members.cache.get(user)

            function rosterList() {
                let usersInRoster = []

                let pageNumber = 1
                if(!args[1] || isNaN(parseInt(args[1]))) pageNumber = 1
                else pageNumber = parseInt(args[1])

                for(let i in rr["factionRoster"]) {
                    if(message.guild.members.cache.get(i)) {
                        usersInRoster.push(`<@${i}>`)
                    } else {
                        usersInRoster.push(`Left Guild - ${i}`)
                    }
                }
                if(usersInRoster.length < 1) return errm(`There is noone in roster.`)
                convertToPage(message, usersInRoster, pageNumber, `There is currently __**${usersInRoster.length} users**__ in the faction roster`, 20)
            }

            if(rr["factionRoster"][user.id]) {
                m(`Removed ${user} from the roster!`)
                delete rr["factionRoster"][user.id]
            } else {
                m(`Added ${user} to the roster!`)
                rr["factionRoster"][user.id] = "yes"
            }

            fs.writeFile(RRPath, ``, (err) => {
                fs.writeFile(RRPath, JSON.stringify(rr, null, 2), (err) => {});  
            });
        }

        if(cmd == "add") {
            let permCheck;
            if(getPerms(message).includes("zml.add")) permCheck = true; if(message.member.roles.cache.find(role => role.name == config["Discord_Configs"]["manager_roleName"])) permCheck = true
            if(permCheck == undefined) return errm(`You require the role \`${config["Discord_Configs"]["manager_roleName"]}\` or \`zml.add\` to use this command.`)

            if(!args[0]) return errorm(`Invalid user`, `${cmd} <@user or ID> [roles to add separated by ,]`)
            let user = args[0].replace(/[<>!@#]+/g, "")
            if(!message.guild.members.cache.get(user)) return errorm(`Invalid user`, `${cmd} <@user or ID> [roles to add separated by ,]`)
            user = message.guild.members.cache.get(user)

            let rcfg = reload(configpath)

            let channel = rcfg["configuration"]["Channels"]["membersChannel"]
            if(!channel || !client.channels.cache.get(channel)) return errm(`The setting \`${membersChannel}\` is invalid`)
            channel = client.channels.cache.get(channel)

            let addedRoles = []
            let roleArrayToAdd = args.slice(1).join(" ").trim()
            if(roleArrayToAdd) {
                roleArrayToAdd = roleArrayToAdd.split(",")
                addedRoles.push("\n \n**Roles Changed:**")
                roleArrayToAdd.forEach(ee => {
                    let foundRole = getRole(message, ee)
                    if(foundRole == false) return addedRoles.push(`${ee} - \`No role found\``)
                    if(user.roles.get(foundRole.id)) return addedRoles.push(`${foundRole} - \`User already has this role\``)
    
                    if(foundRole.position >= message.member.highestRole.position) return addedRoles(`${foundRole} - \`Role is higher than manager's highest role\``)
    
                    user.addRole(foundRole.id)
                    addedRoles.push(`${foundRole}`)
                })
            }

            m(`${user} has been added to the faction by ${message.author}!${addedRoles.join("\n")}`)
            channel.send(({ embeds: [new Discord.MessageEmbed().setColor(maincolor).setDescription(`**${user} has been added to the faction by ${message.author}!**${addedRoles.join("\n")}`)] }))
        }

        if(cmd == "promote") {
            let permCheck;
            if(getPerms(message).includes("zml.promote")) permCheck = true; if(message.member.roles.cache.find(role => role.name == config["Discord_Configs"]["manager_roleName"])) permCheck = true
            if(permCheck == undefined) return errm(`You require the role \`${config["Discord_Configs"]["manager_roleName"]}\` or \`zml.promote\` to use this command.`)

            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <@user or ID> [role to remove, role to add]`)
            let user = args[0].replace(/[<>!@#]+/g, "")
            if(!message.guild.members.cache.get(user)) return errorm(`Invalid user`, `${cmd} <@user or ID> [role to remove, role to add]`)
            user = message.guild.members.cache.get(user)

            let rcfg = reload(configpath)

            let channel = rcfg["configuration"]["Channels"]["membersChannel"]
            if(!channel || !client.channels.cache.get(channel)) return errm(`The setting \`${membersChannel}\` is invalid`)
            channel = client.channels.cache.get(channel)

            let rolesToChange = args.slice(1).join(" ").trim().split(", ")
            if(!rolesToChange[0] || !rolesToChange[1]) return errorm(`Invalid arguments`, `${cmd} <@user or ID> [role to remove, role to add]`) 

            let roleToAdd = getRole(message, rolesToChange[1])
            if(roleToAdd == false) roleToAdd = `[Error parsing role]`
            if(roleToAdd.position >= message.member.role.highest.position) roleToAdd = `[To high to modify (for the Manager)]`
            else user.addRole(roleToAdd.id)

            let roleToRemove = getRole(message, rolesToChange[0])
            if(roleToRemove == false) roleToAdd = `[Error parsing role]`
            if(roleToRemove.position >= message.member.role.highest.position) roleToRemove = `[To high to modify (for the Manager)]`
            else user.removeRole(roleToRemove.id)



            m(`${user} has been promoted from ${roleToRemove} to ${roleToAdd}!`)
            channel.send(({ embeds: [new Discord.MessageEmbed().setColor(maincolor).setDescription(`**${user}**\nPromotion: ${roleToRemove} -> ${roleToAdd}`).setFooter(`by: ${message.author}!**`)] }))
        }

        if(cmd == "demote") {
            let permCheck;
            if(getPerms(message).includes("zml.demote")) permCheck = true; if(message.member.roles.cache.find(role => role.name == config["Discord_Configs"]["manager_roleName"])) permCheck = true
            if(permCheck == undefined) return errm(`You require the role \`${config["Discord_Configs"]["manager_roleName"]}\` or \`zml.demote\` to use this command.`)

            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <@user or ID> [role to remove, role to add]`)
            let user = args[0].replace(/[<>!@#]+/g, "")
            if(!message.guild.members.cache.get(user)) return errorm(`Invalid user`, `${cmd} <@user or ID> [role to remove, role to add]`)
            user = message.guild.members.cache.get(user)

            let rcfg = reload(configpath)

            let channel = rcfg["configuration"]["Channels"]["membersChannel"]
            if(!channel || !client.channels.cache.get(channel)) return errm(`The setting \`${membersChannel}\` is invalid`)
            channel = client.channels.cache.get(channel)

            let rolesToChange = args.slice(1).join(" ").trim().split(", ")
            if(!rolesToChange[0] || !rolesToChange[1]) return errorm(`Invalid arguments`, `${cmd} <@user or ID> [role to remove, role to add]`) 

            let roleToAdd = getRole(message, rolesToChange[1])
            if(roleToAdd == false) roleToAdd = `[Error parsing role]`
            if(roleToAdd.position >= message.member.role.highest.position) roleToAdd = `[To high to modify (for the Manager)]`
            else user.addRole(roleToAdd.id)

            let roleToRemove = getRole(message, rolesToChange[0])
            if(roleToRemove == false) roleToAdd = `[Error parsing role]`
            if(roleToRemove.position >= message.member.role.highest.position) roleToRemove = `[To high to modify (for the Manager)]`
            else user.removeRole(roleToRemove.id)

            m(`${user} has been demoted from ${roleToRemove} to ${roleToAdd}!`)
            channel.send(({ embeds: [new Discord.MessageEmbed().setColor(maincolor).setDescription(`**${user}**\nDemotion: ${roleToRemove} -> ${roleToAdd}`).setFooter(`by: ${message.author}!**`)] }))
        }

        if(cmd == "remove") {
            let permCheck;
            if(getPerms(message).includes("zml.remove")) permCheck = true; if(message.member.roles.cache.find(role => role.name == config["Discord_Configs"]["manager_roleName"])) permCheck = true
            if(permCheck == undefined) return errm(`You require the role \`${config["Discord_Configs"]["manager_roleName"]}\` or \`zml.remove\` to use this command.`)

            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <@user or ID> [-r removes all roles] [-a rolename (add a role)]`)
            let user = args[0].replace(/[<>!@#]+/g, "")
            if(!message.guild.members.cache.get(user)) return errorm(`Invalid user`, `${cmd} <@user or ID> [-r removes all roles] [-a rolename (add a role)]`)
            user = message.guild.members.cache.get(user)

            let rcfg = reload(configpath)

            let channel = rcfg["configuration"]["Channels"]["membersChannel"]
            if(!channel || !client.channels.cache.get(channel)) return errm(`The setting \`${membersChannel}\` is invalid`)
            channel = client.channels.cache.get(channel)

            let rolesToChange = args.slice(1).join(" ").trim().split(/ +/g)

            let changedRoles = []

            if(rolesToChange) {
                let allroles = rolesToChange.join(" ").match(/-r+/g)
                let addRole = rolesToChange.join(" ").match(/-a [\w !<>[\]\\@#$%^&*()_+={};:'"/?.>,<:`]+/g)
                if(allroles) {
                    changedRoles.push("\n \n**Changed Roles:**")
                    changedRoles.push(`ALL roles removed`)

                    user.roles.cache.forEach(rr => {
                        user.removeRole(rr.id)
                    })
                } else {
                    if(addRole) {
                        let roleName = addRole[0]

                        let role = getRole(message, roleName)
                        if(role == false) changedRoles.push(`\`${roleName}\` is not a valid role`)

                        else {
                            changedRoles.push("\n \n**Changed Roles:**")
                            user.addRole(role.id)
                            changedRoles.push(`**Added Role:** ${role}`)
                        }
                    }
                }
            }

            m(`${user} has been removed from the faction by ${message.author}!${changedRoles.join("\n")}`)
            channel.send(({ embeds: [new Discord.MessageEmbed().setColor(maincolor).setDescription(`**${user} has been removed from the faction by ${message.author}!**${changedRoles.join("\n")}`)] }))
        }

        if(cmd == "lock") {
            let permCheck;
            if(getPerms(message).includes("zml.lock")) permCheck = true; if(message.member.permissions.has("MANAGE_MESSAGES")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`MANAGE_MESSAGES\` or \`zml.lock\` to use this command.`)
            
            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} [#channel or ID] [-t time]`)

            if(args.join(" ").match(/-t [\w]+/g)) {
                let match = args.join(" ").match(/-t [\w]+/g)
                let time = (Number(match[0].split(/ +/g)[1])*60000).toString()
                let channel = message.guild.channels.cache.get(args.join(" ").replace(match.join(" "), "").replace(/[<>!@#\ ]+/g, ""))
                if(!channel) channel = message.channel

                    let cfg = reload(configpath)
                    if(cfg["configuration"]) {
                        if(cfg["configuration"]["Channels"]["logChannel"]) {
                            if(message.guild.channels.cache.get(cfg["configuration"]["Channels"]["logChannel"])) {
                                let logChannel = message.guild.channels.cache.get(cfg["configuration"]["Channels"]["logChannel"])
        
                                let logEmbed = new Discord.MessageEmbed()
                                .setColor(maincolor)
                                .setFooter(message.author.tag, message.author.avatarURL)
                                .setDescription(`**__Locked Channel__**\n \n**Channel:** ${channel} [${channel.id}]\n**Locked For:** ${time/600000} minutes\n**Locked at:** ${getFormattedTime(new Date())}`)
        
                                m(`${channel} has been locked for ${Number(time)/60000} minutes`)

                                let everyone = message.guild.roles.cache.find(role => role.name == "@everyone")
                                channel.permissionOverwrites.create(everyone, {
                                    "SEND_MESSAGES" : false
                                })

                                logChannel.send(({ embeds: [logEmbed] }))
                            }
                        }
                    } else return errorm(`The bot has not yet been setup`)

                    setTimeout(() => {
                        let everyone = message.guild.roles.cache.find(role => role.name == "@everyone")
                        channel.permissionOverwrites.create(everyone, {
                            "SEND_MESSAGES" : true
                        })
                        m(`${channel} has been unlocked!`)
                    }, ms(time))
            } else {
                let channel = message.guild.channels.cache.get(args.join(" ").replace(/[<>!@#\ ]+/g, ""))
                if(!channel) channel = message.channel

                    let cfg = reload(configpath)
                    if(cfg["configuration"]) {
                        if(cfg["configuration"]["Channels"]["logChannel"]) {
                            if(message.guild.channels.cache.get(cfg["configuration"]["Channels"]["logChannel"])) {
                                let logChannel = message.guild.channels.cache.get(cfg["configuration"]["Channels"]["logChannel"])
        
                                let logEmbed = new Discord.MessageEmbed()
                                .setColor(maincolor)
                                .setFooter(message.author.tag, message.author.avatarURL)
                                .setDescription(`**__Locked Channel__**\n \n**Channel:** ${channel} [${channel.id}]\n**Locked For:** Permanent\n**Locked at:** ${getFormattedTime(new Date())}`)
        
                                m(`${channel} has been locked`)

                                let everyone = message.guild.roles.cache.find(role => role.name == "@everyone")
                                channel.permissionOverwrites.create(everyone, {
                                    "SEND_MESSAGES" : false
                                })

                                logChannel.send(({ embeds: [logEmbed] }))
                            }
                        }
                    } else return errorm(`The bot has not yet been setup`)

            }
        }

        if(cmd == "unlock") {
            let permCheck;
            if(getPerms(message).includes("zml.unlock")) permCheck = true; if(message.member.permissions.has("MANAGE_MESSAGES")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`MANAGE_MESSAGES\` or \`zml.unlock\` to use this command.`)
            
            let channel

            if(!args[0]) channel = message.channel
            else channel = message.guild.channels.cache.get(args.join(" ").replace(/[<>!@#\ ]+/g, ""))
            if(!channel) channel = message.channel

                    let cfg = reload(configpath)
                    if(cfg["configuration"]) {
                        if(cfg["configuration"]["Channels"]["logChannel"]) {
                            if(message.guild.channels.cache.get(cfg["configuration"]["Channels"]["logChannel"])) {
                                let logChannel = message.guild.channels.cache.get(cfg["configuration"]["Channels"]["logChannel"])
        
                                let logEmbed = new Discord.MessageEmbed()
                                .setColor(maincolor)
                                .setFooter(message.author.tag, message.author.avatarURL)
                                .setDescription(`**__Un-Locked Channel__**\n \n**Channel:** ${channel} [${channel.id}]\n**Locked at:** ${getFormattedTime(new Date())}`)
        
                                m(`${channel} has been unlocked`)

                                let everyone = message.guild.roles.cache.find(role => role.name == "@everyone")
                                channel.permissionOverwrites.create(everyone, {
                                    "SEND_MESSAGES" : true
                                })

                                logChannel.send(({ embeds: [logEmbed] }))
                            }
                        }
                    } else return errorm(`The bot has not yet been setup`)
        }

        if(cmd == "relog") {
            let permCheck;
            if(getPerms(message).includes("zml.relog")) permCheck = true; if(message.member.permissions.has("ADMINISTRATOR")) permCheck = true
            if(permCheck == undefined) return errm(`You require the permission \`ADMINISTRATOR\` or \`zml.relog\` to use this command.`)

            if(bot.username) {
                console.log(` \n    [${bot.username == undefined ? `Bot not logged in` : bot.username}] Relogging in 20 seconds.\n `)

                    bot.end()
            } else {
                    bot = mineflayer.createBot(botReason)
                    fs.writeFileSync('./bot', JSON.stringify(bot, null, 4));
                    botEvent(bot)
            }

            m(`Relogging \`${bot.username == undefined ? `[Bot not logged in]` : bot.username}\``)
        }



        if(cmd == "checked") {
            let conf = reload(configpath)
            if(!conf["configuration"]) return errm(`The bot is currently not setup`)
            if(conf["configuration"]["Switches"]["wallChecks"] != true) return errm(`Wall Checks are currently disabled`)
            
            let iamDB = reload(verifiedPath)
            let verifu = []
            for(let i in iamDB) {if(iamDB[i]["isVerified"] == true) {verifu.push(iamDB[i]["Discord"])}}
            if(!verifu.includes(message.author.id)) return errm(`You need to be verified with \`${prefix}verify\` to use this command.`)

            let ign

            for(let i in iamDB) {if(iamDB[i]["Discord"] == message.author.id) {ign = i}}

            if(cooldowns["wallCheck"]) {
                if(cooldowns["wallCheck"][message.author]) {
                    if(cooldowns["wallCheck"][message.author]["isValidCooldown"] == true) {
                        return errm(`You are currently on a cooldown! [${prettyMilliseconds(config["ingame_configs"]["wallCheckCooldown"] - Math.abs(cooldowns["wallCheck"][message.author]["cooldownSet"] - new Date(), {verbose: true}))} remaining]`)
                    }
                }
            }

            if(checkGracePeriod() == true && config["ingame_configs"]["fgrace_wallChecks"] == false) return errm(`The FGrace Period is currently enabled.`)
            cooldown(message.author, `wallCheck`, config["ingame_configs"]["wallCheckCooldown"])

                let players = []
            for(let i in bot.players) {players.push(i)}
            if(!players.includes(ign)) return errm(`You must be on \`${config["altinfo"]["serverIP"]}\` to run this command`)

            wallCheck(ign)
            
        }

        if(cmd == "bchecked") {
            let conf = reload(configpath)

            if(!conf["configuration"]) return errm(`The bot is currently not setup`)
            if(conf["configuration"]["Switches"]["bufferChecks"] != true) return errm(`Buffer Checks are currently disabled`)

            let iamDB = reload(verifiedPath)
            let verifu = []
            for(let i in iamDB) {if(iamDB[i]["isVerified"] == true) {verifu.push(iamDB[i]["Discord"])}}
            if(!verifu.includes(message.author.id)) return errm(`You need to be verified with \`${prefix}verify\` to use this command.`)

            let ign

            for(let i in iamDB) {if(iamDB[i]["Discord"] == message.author.id) {ign = i}}

            if(cooldowns["bufferCheck"]) {
                if(cooldowns["bufferCheck"][message.author]) {
                    if(cooldowns["bufferCheck"][message.author]["isValidCooldown"] == true) {
                        return errm(`You are currently on a cooldown! [${prettyMilliseconds(config["ingame_configs"]["bufferCheckCooldown"] - Math.abs(cooldowns["bufferCheck"][message.author]["cooldownSet"] - new Date(), {verbose: true}))} remaining]`)
                    }
                }
            }

            if(checkGracePeriod() == true && config["ingame_configs"]["fgrace_bufferChecks"] == false) return errm(`The FGrace Period is currently enabled.`)

            cooldown(message.author, `bufferCheck`, config["ingame_configs"]["bufferCheckCooldown"])

            let players = []
            for(let i in bot.players) {players.push(i)}
            if(!players.includes(ign)) return errm(`You must be on \`${config["altinfo"]["serverIP"]}\` to run this command`)

            bufferCheck(ign)
            
        }

        if(cmd == "stats") {
            let iamDB = reload(verifiedPath)
            let useri = reload(userStatsPath)
            let verifu = []
            for(let i in iamDB) {if(iamDB[i]["isVerified"] == true) {verifu.push(iamDB[i]["Discord"])}}
            if(!verifu.includes(message.author.id)) return errm(`You need to be verified with \`${prefix}verify\` to use this command.`)

            if(!args[0]) return errorm(`Invalid arguments`, `${cmd} <@user or ID | IGN>`)

            let replaced = args[0].replace(/[<>!@#]+/g, "")

            let available = []
            let availableLC = []

            for(let i in useri) {available.push(i); availableLC.push(i.toLowerCase())}

            if(verifu.includes(replaced)) {
                let player
                for(let i in iamDB) {
                    if(iamDB[i]["Discord"] == replaced) {
                        player = i
                    }
                }
                if(player == undefined) return errm(`${args[0]} is not in the stats database`)
                if(!useri[player]) return errm(`${args[0]} is not in the stats database`)

                let embed = new Discord.MessageEmbed()
                .setColor(maincolor)
                .setTitle(`**__Stats for__**: ${player}`)
                .setDescription(`**Discord:** ${message.guild.members.cache.get(iamDB[player]["Discord"]) == undefined ? `Left server - ${iamDB[player]["Discord"]}` : message.guild.members.cache.get(iamDB[player]["Discord"])}\n \n**Wall Checks:** ${cn(useri[player]["wallChecks"])}\n**Buffer Checks:** ${cn(useri[player]["bufferChecks"])}\n**Money Deposited:** $${cn(useri[player]["totalDeposited"])}\n \n**Last Wall Check:** ${getFormattedTime(useri[player]["lastWallCheck"])}\n**Last Buffer Check:** ${getFormattedTime(useri[player]["lastBufferCheck"])}`)
            
                message.channel.send(({ embeds: [embed] }))
            } else if(availableLC.includes(args[0].toLowerCase())) {
                let player = available[availableLC.indexOf(args[0].toLowerCase())]

                let embed = new Discord.MessageEmbed()
                .setColor(maincolor)
                .setTitle(`**__Stats for__**: ${player}`)
                .setDescription(`**Discord:** ${message.guild.members.cache.get(iamDB[player]["Discord"]) == undefined ? `Left server - ${iamDB[player]["Discord"]}` : message.guild.members.cache.get(iamDB[player]["Discord"])}\n \n**Wall Checks:** ${cn(useri[player]["wallChecks"])}\n**Buffer Checks:** ${cn(useri[player]["bufferChecks"])}\n**Money Deposited:** $${cn(useri[player]["totalDeposited"])}\n \n**Last Wall Check:** ${getFormattedTime(useri[player]["lastWallCheck"])}\n**Last Buffer Check:** ${getFormattedTime(useri[player]["lastBufferCheck"])}`)
            
                message.channel.send(({ embeds: [embed] }))
            } else return errm(`${args[0]} is not in the stats database`)
        }

        if(cmd == "walls" || cmd == "buffers") {
            let iamDB = reload(verifiedPath)
            let others = reload(otherInfoPath)
            let checkDB = reload(userStatsPath)
            let verifu = []
            for(let i in iamDB) {if(iamDB[i]["isVerified"] == true) {verifu.push(iamDB[i]["Discord"])}}
            if(!verifu.includes(message.author.id)) return errm(`You need to be verified with \`${prefix}verify\` to use this command.`)

            let checkers = []
            let bcheckers = []
            for(let i in checkDB) {if(checkDB[i]["lastWallCheck"] != "Never") checkers.push([i, new Date(checkDB[i]["lastWallCheck"])]); if(checkDB[i]["lastBufferCheck"] != "Never") bcheckers.push([i, new Date(checkDB[i]["lastBufferCheck"])]);}
            checkers.sort((a, b) => {return a[1] - b[1]}).reverse()
            bcheckers.sort((a, b )=> {return a[1] - b[1]}).reverse()

            let embed = new Discord.MessageEmbed().setColor(maincolor)
            .setTitle(`**__Walls & Buffers Statistics__**`)
            .setDescription(`**Walls:** \`${getFormattedTime(others["lastWallCheck"])}\`\n**Buffers:** \`${getFormattedTime(others["lastBufferCheck"])}\`\n \n**Last Wall Checker:** ${checkers[0][0] == undefined ? `No last checker` : checkers[0][0]}\n**Last Buffer Checker:** ${bcheckers[0][0] == undefined ? `No last checker` : bcheckers[0][0]}`)

            message.channel.send(({ embeds: [embed] }))
        }

        if(cmd == "ctop" || cmd == "checkstop") {
            let iamDB = reload(verifiedPath)
            let others = reload(otherInfoPath)
            let checkDB = reload(userStatsPath)
            let verifu = []
            for(let i in iamDB) {if(iamDB[i]["isVerified"] == true) {verifu.push(iamDB[i]["Discord"])}}
            if(!verifu.includes(message.author.id)) return errm(`You need to be verified with \`${prefix}verify\` to use this command.`)

            let topCheckers = []
            let topCheckersFormat = []

            for(let i in checkDB) {
                topCheckers.push([i, checkDB[i]["wallChecks"]])
            }

            topCheckers.sort((a, b) => {
                return a[1] - b[1]
            }).reverse()

            let pagenumber = 1
            if(args[0] && !isNaN(parseInt(args[0]))) {
                pagenumber = parseInt(args[0])
            }

            for(let i = 0; i < topCheckers.length; i++) {
                topCheckersFormat.push(`**${i+1}.** ${topCheckers[i][0]} - ${topCheckers[i][1]} checks`)
            }

            convertToPage(message, topCheckersFormat, pagenumber, `There is __**${topCheckersFormat.length} wall checkers**__`, 20)
        }

        if(cmd == "btop" || cmd == "buffertop") {
            let iamDB = reload(verifiedPath)
            let others = reload(otherInfoPath)
            let checkDB = reload(userStatsPath)
            let verifu = []
            for(let i in iamDB) {if(iamDB[i]["isVerified"] == true) {verifu.push(iamDB[i]["Discord"])}}
            if(!verifu.includes(message.author.id)) return errm(`You need to be verified with \`${prefix}verify\` to use this command.`)

            let topCheckers = []
            let topCheckersFormat = []

            for(let i in checkDB) {
                topCheckers.push([i, checkDB[i]["bufferChecks"]])
            }

            topCheckers.sort((a, b) => {
                return a[1] - b[1]
            }).reverse()

            let pagenumber = 1
            if(args[0] && !isNaN(parseInt(args[0]))) {
                pagenumber = parseInt(args[0])
            }

            for(let i = 0; i < topCheckers.length; i++) {
                topCheckersFormat.push(`**${i+1}.** ${topCheckers[i][0]} - ${topCheckers[i][1]} checks`)
            }

            convertToPage(message, topCheckersFormat, pagenumber, `There is __**${topCheckersFormat.length} buffer checkers**__`, 20)
        }

        if(cmd == "dtop" || cmd == "deposittop") {
            let iamDB = reload(verifiedPath)
            let others = reload(otherInfoPath)
            let checkDB = reload(userStatsPath)
            let verifu = []
            for(let i in iamDB) {if(iamDB[i]["isVerified"] == true) {verifu.push(iamDB[i]["Discord"])}}
            if(!verifu.includes(message.author.id)) return errm(`You need to be verified with \`${prefix}verify\` to use this command.`)

            let topCheckers = []
            let topCheckersFormat = []

            for(let i in checkDB) {
                topCheckers.push([i, checkDB[i]["totalDeposited"]])
            }

            topCheckers.sort((a, b) => {
                return a[1] - b[1]
            }).reverse()

            let pagenumber = 1
            if(args[0] && !isNaN(parseInt(args[0]))) {
                pagenumber = parseInt(args[0])
            }

            for(let i = 0; i < topCheckers.length; i++) {
                topCheckersFormat.push(`**${i+1}.** ${topCheckers[i][0]} - $${cn(topCheckers[i][1])}`)
            }

            convertToPage(message, topCheckersFormat, pagenumber, `There is __**${topCheckersFormat.length} total players who've deposited**__`, 20)
        }

        if(cmd == "weewoo") {
            let iamDB = reload(verifiedPath)
            
            let conf = reload(configpath)
            if(!conf["configuration"]) return errm(`The bot is currently not setup`)
            if(conf["configuration"]["Switches"]["wallChecks"] != true) return errm(`WooWoo is currently disabled`)

            let verifu = []
            for(let i in iamDB) {if(iamDB[i]["isVerified"] == true) {verifu.push(iamDB[i]["Discord"])}}
            if(!verifu.includes(message.author.id)) return errm(`You need to be verified with \`${prefix}verify\` to use this command.`)

            let ign

            for(let i in iamDB) {if(iamDB[i]["Discord"] == message.author.id) {ign = i}}

            if(ign != undefined) {
                if(args.join(" ").toLowerCase().includes("start")) {
                    weewooIsEnabled = true
                    m(`WeeWoo has been started.`)
                    weeWoo(ign, message)
                } else if(args.join(" ").toLowerCase().includes("stop")) {
                    weewooIsEnabled = false
                    m(`WeeWoo has been stopped.`)
                } else weeWoo(ign, message)
            }
        }

    })

    //
    // PLAYTIME TRACKER
    //

    cron.schedule("30 * * * * *", async() => {
        if(config["ingame_configs"]["playtime_isTracked"] == true) {
            let players = []
            let playtimeFile = reload(playtimepath)
            if(bot) {
                for(let i in bot.players) {players.push(i)}
                
                players.forEach(player => {
                    if(playtimeFile[config["altinfo"]["serverIP"]]) {
                        if(playtimeFile[config["altinfo"]["serverIP"]][player]) {
                            playtimeFile[config["altinfo"]["serverIP"]][player] = playtimeFile[config["altinfo"]["serverIP"]][player]+1
                        } else {
                            playtimeFile[config["altinfo"]["serverIP"]][player] = 1
                        }
                    } else {
                        playtimeFile[config["altinfo"]["serverIP"]] = {}

                        setTimeout(() => {
                            playtimeFile[config["altinfo"]["serverIP"]][player] = 1
                            fs.writeFile(playtimepath, ``, (err) => {
                                fs.writeFile(playtimepath, JSON.stringify(playtimeFile, null, 2), (err) => {});  
                            });   
                        },2000)
                    }
                    fs.writeFile(playtimepath, ``, (err) => {
                        fs.writeFile(playtimepath, JSON.stringify(playtimeFile, null, 2), (err) => {});  
                    });
                })
            }
        }
      });

    //
    // AUTOMATED FEATURES
    //

    // VANISH
    cron.schedule(`33 */${config["ingame_configs"]["vanish"]} * * * *`, async() => {
        let cfg = reload(configpath)

        if(config["ingame_configs"]["ingame_features_isEnabled"] !== true) return
        if(!cfg["configuration"]) return
        if(!cfg["configuration"]["Switches"]["vanish"] == true) return
        if(cfg["configuration"]) {
            if(cfg["configuration"]["Channels"]) {
                if(!cfg["configuration"]["Channels"]["vanishChannel"]) return
            } else return
        } else return

        

        vanishChannel = client.channels.cache.get(cfg["configuration"]["Channels"]["vanishChannel"])

        let users = []
        for(let i in bot.players) {users.push(i)}

        let embed = new Discord.MessageEmbed()
            .setColor(maincolor)
        let amount;
        let vanishkids = []
        if(bot != null) {
            bot.tabComplete(`/minecraft:tell `, (lol, match) => {
                let actualplayers = []
                match.forEach(mm => {
                    if(mm == "@console") return
                    
                    else actualplayers.push(mm)
                })

                

                for(let i = 0; i < users.length; i++) {
                    if(!users.includes(actualplayers[i])) vanishkids.push(actualplayers[i])
                }

                amount = vanishkids.length <= 0 ? 0: vanishkids.length ;

                if(amount == 0) {embed.setDescription(`🕵️ \u00BB __There is no one in vanish__`); }
                else if(amount == 1) {embed.setDescription(`**🕵️ \u00BB __${amount}__:**\n**${vanishkids.join(", ")}** is currently vanished`)}
                else{
                embed.setDescription(`**🕵️ \u00BB __${amount}__:**\n${vanishkids.join("\n")}`);
                embed.setFooter(`Faction Bot - vanish tracker`)}
            }, false, false)
            setTimeout(() => {
                vanishChannel.send(embed)
                if(config["ingame_configs"]["vanish_ingame"] == true) {
                    bot.chat(`/f c f`)
                    if(amount == 0) bot.chat(`There is noone in vanish`)
                    if(amount == 1) bot.chat(`${vanishkids.join(", ")} is currently vanished.`)
                    if(amount > 1) bot.chat(`${vanishkids.join(", ")} are in vanish.`)
                }
                return
            }, 500);
            
        }
    });

    // FTop
    cron.schedule(`10 ${config["ingame_configs"]["ftopTime"]} * * * *`, async() => {
        if(config["ingame_configs"]["ingame_features_isEnabled"] !== true) return
        if(config["ingame_configs"]["ftop_enabled"] !== true) return
        
        let cfg = reload(configpath)

        let ftopNum = 1

        if(cfg["configuration"]) {
            if(cfg["configuration"]["Channels"]) {
                if(!cfg["configuration"]["Channels"]["ftopChannel"]) return
            } else return
        } else return

        if(cfg["configuration"]["Switches"]["autoFtop"] == false) return

        if(!client.channels.cache.get(cfg["configuration"]["Channels"]["ftopChannel"])) return

        bot.chat(config["ingame_configs"]["ftopCMD"].split("[num]").join(ftopNum))
        ftopMSG = client.channels.cache.get(cfg["configuration"]["Channels"]["ftopChannel"])
        rawFTop = []
        ftopReadyToSend = true
        ftopStillSending = false
    });

    // FList
    cron.schedule(`15 ${config["ingame_configs"]["flistTime"]} * * * *`, async() => {
        if(config["ingame_configs"]["ingame_features_isEnabled"] !== true) return
        if(config["ingame_configs"]["flist_enabled"] !== true) return

        let cfg = reload(configpath)

        if(cfg["configuration"]) {
            if(cfg["configuration"]["Channels"]) {
                if(!cfg["configuration"]["Channels"]["flistChannel"]) return
            } else return
        } else return

        if(cfg["configuration"]["Switches"]["autoFlist"] == false) return

        if(!client.channels.cache.get(cfg["configuration"]["Channels"]["flistChannel"])) return


        bot.chat(config["ingame_configs"]["flistCMD"])
        flistData = []
        flistReady = true
        flistChannel = client.channels.cache.get(cfg["configuration"]["Channels"]["flistChannel"])
    });

    // FOnline
    cron.schedule(`23 */${config["ingame_configs"]["fwho_onlineTimeRange"]} * * * *`, async() => {
        for(let i = 0; i < config["ingame_configs"]["autoOnlineFactions"].length; i++) {
            setTimeout(() => {
                if(config["ingame_configs"]["ingame_features_isEnabled"] !== true) return
                if(config["ingame_configs"]["fwho_online_enabled"] !== true) return
    
                let cfg = reload(configpath)

                if(cfg["configuration"]) {
                    if(cfg["configuration"]["Channels"]) {
                        if(!cfg["configuration"]["Channels"]["facAuditChannel"]) return
                    } else return
                } else return
        
                if(cfg["configuration"]["Switches"]["facAudit"] == false) return
        
                if(!client.channels.cache.get(cfg["configuration"]["Channels"]["facAuditChannel"])) return

                bot.chat(`/f who ${config["ingame_configs"]["autoOnlineFactions"][i]}`)
                fWhoOnlineData = []
                fwhoOnlineReady = true
                fwhoOnlineChannel = client.channels.cache.get(cfg["configuration"]["Channels"]["facAuditChannel"])
                fOnlineFac = config["ingame_configs"]["autoOnlineFactions"][i]
            }, (i*10000))
        }
    });

        // WeeWoo
        cron.schedule(`*/20 * * * * *`, async() => {
            if(weewooIsEnabled != true) return

            let maincfg = reload(configpath)

            let wallChannel
            if(maincfg["configuration"]) {
                if(maincfg["configuration"]["Channels"]) {
                    if(maincfg["configuration"]["Channels"]["wallChannel"]) {
                        wallChannel = maincfg["configuration"]["Channels"]["wallChannel"]
                    } else return
                } else return
            } else return
        
            wallChannel = client.channels.cache.get(wallChannel)
            if(!wallChannel) return
            
            let roles = config["ingame_configs"]["roles_toTag"]
        
            let realRoles = []
        
            let msg = {
                "guild" : client.guilds.get(config["Discord_Configs"]["main_guild"])
            }
        
            roles.cache.forEach(lolxd => {
                realRoles.push(getRole(msg, lolxd) == false ? `Not a role [${lolxd}]` : getRole(msg, lolxd).toString())
            })
        
            let message = `${realRoles.join(" ")}`
        
            wallChannel.send(message).then(res => {
                res.delete()
        
                let embed = new Discord.MessageEmbed()
                .setColor(errorcolor)
                .setDescription(`:boom: WeeWoo is currently activated! Log on ${config["altinfo"]["serverIP"]} and help!`)
        
                res.channel.send(embed)
            })
        });

        // WallChecks & Buffer Checks
        cron.schedule(`* * * * *`, async() => {
            let maincfg = reload(configpath)

            let wallChannel
            let bufferChannel
            if(maincfg["configuration"]) {
                if(!maincfg["configuration"]["Switches"]) return
                if(maincfg["configuration"]["Switches"]["wallChecks"]) {if(maincfg["configuration"]["Switches"]["wallChecks"] == true) {
                    ++wallsOverdue
                }}

                if(maincfg["configuration"]["Switches"]["bufferChecks"]) {if(maincfg["configuration"]["Switches"]["bufferChecks"] == true) {
                    ++buffersOverdue
                }}

                if(maincfg["configuration"]["Channels"]) {
                    if(!maincfg["configuration"]["Channels"]) return
                    if(maincfg["configuration"]["Channels"]["wallChannel"]) {
                        wallChannel = client.channels.cache.get(maincfg["configuration"]["Channels"]["wallChannel"])
                    }

                    if(maincfg["configuration"]["Channels"]["bufferChannel"]) {
                        bufferChannel = client.channels.cache.get(maincfg["configuration"]["Channels"]["bufferChannel"])
                    }
                } else return
            } else return
            
            function getRolesToTag() {
                let roles = config["ingame_configs"]["roles_toTag"]
                let realRoles = []
                let msg = {
                    "guild" : client.guilds.get(config["Discord_Configs"]["main_guild"])
                }
                roles.cache.forEach(lolxd => {
                    realRoles.push(getRole(msg, lolxd) == false ? `Not a role [${lolxd}]` : getRole(msg, lolxd).toString())
                })
                return realRoles.join(" ")
            }

            if(wallsOverdue % maincfg["configuration"]["Messages"]["wallTime"] === 0) {
                if(checkGracePeriod() == true && config["ingame_configs"]["fgrace_wallChecks"] == false) {}
                else if(maincfg["configuration"]["Switches"]["wallChecks"] == true) {
                    if(wallChannel) {
                        wallChannel.send(getRolesToTag()).then(mmh => {
                            mmh.delete()

                            mmh.channel.send(new Discord.MessageEmbed().setColor(errorcolor).setDescription(`:warning: **Walls** have been unchecked for ${wallsOverdue} ${wallsOverdue == 1 ? `minute` : `minutes`}!`))

                            if(config["ingame_configs"]["walls_ingame"] == true) {
                                let msg = maincfg["configuration"]["Messages"]["wallMsg"].replace(/\[minutes]+/, wallsOverdue)
                                if(bot) {
                                    if(config["ingame_configs"]["ingame_features_isEnabled"] == true) {
                                        bot.chat(msg)
                                    }
                                }
                            }
                        })
                    }
                }
            }

            if(buffersOverdue % maincfg["configuration"]["Messages"]["bufferTime"] === 0) {
                if(checkGracePeriod() == true && config["ingame_configs"]["fgrace_bufferChecks"] == false) {}
                else if(maincfg["configuration"]["Switches"]["bufferChecks"] == true) {
                    if(bufferChannel) {
                        bufferChannel.send(getRolesToTag()).then(mmh => {
                            mmh.delete()

                            mmh.channel.send(new Discord.MessageEmbed().setColor(errorcolor).setDescription(`:warning: **Buffers** have been unchecked for ${buffersOverdue} ${buffersOverdue == 1 ? `minute` : `minutes`}!`))

                            if(config["ingame_configs"]["buffer_ingame"] == true) {
                                let msg = maincfg["configuration"]["Messages"]["bufferMsg"].replace(/\[minutes]+/, buffersOverdue)
                                if(bot) {
                                    if(config["ingame_configs"]["ingame_features_isEnabled"] == true) {
                                        bot.chat(msg)
                                    }
                                }
                            }
                        })
                    }
                }
            }
        });

        //
        //  JOINLEAVE
        //

        client.on("guildMemberAdd", async member => {
            let cfg = reload(configpath)
            let mainguild = config["Discord_Configs"]["main_guild"]

            if(member.guild.id != mainguild) return

            let msg = cfg["configuration"]["Messages"]["joinMsg"].replace(/\[user]+/, member).replace(/\[server]+/, member.guild.name).replace(/\[user_tag]+/, member.user.tag).replace(/\[user_id]+/, member.user.id)

            if(!cfg["configuration"]) return
            if(cfg["configuration"]["Switches"]["joinleave"] != true) return

            let channel = client.channels.cache.get(cfg["configuration"]["Channels"]["joinleaveChannel"])
            if(!channel) return
            member.addRole(member.guild.roles.find(role => role.name === `${config["Discord_Configs"]["joinRole"]}`));
            if(cfg["configuration"]["Switches"]["embedJoinLeave"] == true) {
                channel.send(new Discord.MessageEmbed().setColor(maincolor).setDescription(msg))
            } else {
                channel.send(msg)
            }
        })

        client.on("guildMemberRemove", async member => {
            let cfg = reload(configpath)
            let mainguild = config["Discord_Configs"]["main_guild"]

            if(member.guild.id != mainguild) return

            let msg = cfg["configuration"]["Messages"]["leaveMsg"].replace(/\[user]+/, member).replace(/\[server]+/, member.guild.name).replace(/\[user_tag]+/, member.user.tag).replace(/\[user_id]+/, member.user.id)

            if(!cfg["configuration"]) return
            if(cfg["configuration"]["Switches"]["joinleave"] != true) return

            let channel = client.channels.cache.get(cfg["configuration"]["Channels"]["joinleaveChannel"])
            if(!channel) return

            if(cfg["configuration"]["Switches"]["embedJoinLeave"] == true) {
                channel.send(new Discord.MessageEmbed().setColor(errorcolor).setDescription(msg))
            } else {
                channel.send(msg)
            }
        })
}
