const Discord = require('discord.js');
const config = require('./config.json');
const bot = new Discord.Client();
const fetchCommentPage = require('youtube-comment-api');
const SQLite = require('better-sqlite3');
const sql = new SQLite('./scores.sqlite');

bot.on('ready', () => {
    let dt = new Date();
    let utcDate = dt.toUTCString();
    console.log('[' + utcDate + '] ' + 'We logged in, boi');
    // bot.user.setGame('Half Life 3');
    // bot.user.setAvatar('./media/avatar.jpg');

    // check for database
    const table = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='scores';").get();
    if (!table['count(*)']) {
        // setup database if missing
        sql.prepare("CREATE TABLE scores (id TEXT PRIMARY KEY, user TEXT, guild TEXT, cash INTEGER);").run();
        sql.prepare("CREATE UNIQUE INDEX idx_scores_id ON scores (id);").run();
        sql.pragma("synchronous = 1");
        sql.pragma("journal_mode = wal");
    }

    bot.getScore = sql.prepare("SELECT * FROM scores WHERE user = ? AND guild = ?");
    bot.setScore = sql.prepare("INSERT OR REPLACE INTO scores (id, user, guild, cash) VALUES (@id, @user, @guild, @cash);");
});

bot.on('message', message => {
    let dt = new Date();
    let utcDate = dt.toUTCString();
    if (message.author.bot) return; // bots don't need to talk to each other
    let score;

    // log all messages
    if (message.content) {
        console.log('[' + utcDate + '] ' + message.author.username + ': ' + message.content);
    }

    // casino
    if (message.guild) {
        score = bot.getScore.get(message.author.id, message.guild.id);
        if (!score) {
            score = { id: `${message.guild.id}-${message.author.id}`, user: message.author.id, guild: message.guild.id, cash: 0};
        }

        score.cash += Math.floor(Math.random() * Math.floor(10)); // add $0-10 every time someone sends a message

        // money command, display balance
        if (message.content.startsWith(config.prefix + 'money')) {
            const embed = new Discord.RichEmbed()
                .setTitle("Money")
                .setAuthor(bot.user.username, bot.user.avatarURL)
                .setColor(0x00AE86)
                .addField(name="Cash", value='$' + score.cash, inline=true)

            message.channel.send({embed});
        }

        // top 5 Leaderboard
        if (message.content.startsWith(config.prefix + 'leaderboard')) {
            const top5 = sql.prepare("SELECT * FROM scores WHERE guild = ? ORDER BY cash DESC LIMIT 5;").all(message.guild.id);

            const embed = new Discord.RichEmbed()
                .setTitle("Leaderboard")
                .setAuthor(bot.user.username, bot.user.avatarURL)
                .setColor(0x00AE86);

            for (const data of top5) {
                embed.addField(bot.users.get(data.user).tag, `$${data.cash}`);
            }

            message.channel.send({embed});
        }

        bot.setScore.run(score);
    }

    // something stupid
    // let d = Math.random();
    // if (message.content && d < 0.001 && !(message.content.startsWith('http'))) {
    //     message.reply('Allegedly...');
    // }

    // delete last message or delete all, admin permission
    // if (message.content.startsWith(config.prefix + 'delete')) {
    //     let adminRole = message.guild.roles.find('name', 'Admin');
    //     if (!message.member.roles.has(adminRole.id)) {
    //         return message.reply("You don't have permission to use this command, bruh");
    //     }
    //     let numberOfMsgs = 2;
    //     if (message.content == (config.prefix + 'delete all')) {
    //         numberOfMsgs = 50;
    //     }
    //     message.channel.fetchMessages({ limit: numberOfMsgs })
    //         .then(messages => {
    //             message.channel.bulkDelete(messages);
    //             console.log('[' + utcDate + '] ' + 'Deleting ' + numberOfMsgs + ' messages');
    //         })
    //         .catch(console.error);
    // }

    // kick husken when he says something in chat (1% chance)
    if (message.author.id == config.huskenID && d < 0.1) {
        let kickMember = message.guild.member(message.author);
        kickMember.kick();
        message.channel.send('*kicked Husken*');
    }


    // whenever a youtube link is posted, grab a random comment and post
    // youtube-comment-api by default has a 2 minute cache
    if (message.content.startsWith('https://www.youtube.com') || message.content.startsWith('https://youtu.be')) {
        // some regular expression stuff I won't pretend to understand
        let regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        let videoID = message.content.match(regExp);
        if (videoID && videoID[2].length == 11) {
            videoID = videoID[2];
        } else {
            console.log('[' + utcDate + '] ' + 'Error with the video ID');
        }
        // fetch comments via youtube-comment-api
        fetchCommentPage(videoID)
            .then(commentPage => {
                console.log('[' + utcDate + '] ' + commentPage.comments[1].text);
                return message.channel.send(commentPage.comments[1].text);
            })
            .catch(error => {
                console.log('[' + utcDate + '] ' + error);
                return; // videos without a comment should not return anything
            });
    }

    // custom reaction command
    if (message.content.startsWith(config.prefix + 'react')) {
        let reactionText = message.content.slice(7).toLowerCase(); // get the content after '!react' command including space
        let reactionArray = reactionText.split('');
        const distinctReactions = [...new Set(reactionArray)];

        // check if array has duplicated letters or whitespace and display command rules if true
        if (reactionArray.length > distinctReactions.length || reactionText.indexOf(' ') >= 0) {
            message.channel.send(config.reactionCommandEmbed);
        }

        message.channel.fetchMessages({ limit: 2 }) // get last message before command
            .then(messages => {
                let lastMessage = messages.last();
                message.delete();

                (async () => {
                    for (let rLetter of reactionArray) {
                        await lastMessage.react(config.regionalLetters[rLetter]);
                    }
                })()
            })
            .catch(console.error);
    }
});

bot.on('voiceStateUpdate', (oldMember, newMember) => {
    let dt = new Date();
    let utcDate = dt.toUTCString();
    let newUserChannel = newMember.voiceChannel;
    let oldUserChannel = oldMember.voiceChannel;

    let discordUsers = [
        {'id': config.benID, 'file': './media/seinfeld-theme-snip.mp3'},
        {'id': config.jeebzID, 'file': './media/gnome.mp3'},
        {'id': config.jaredID, 'file': './media/jared.mp3'},
        {'id': config.ownerID, 'file': './media/kungfu.mp3'}
    ];

    let discordUser = discordUsers.find(discordUser => discordUser.id == newMember.user.id)

    // detect when users join and leave channels.
    if (oldUserChannel === undefined && newUserChannel !== undefined
        || oldUserChannel && newUserChannel && oldUserChannel.id != newUserChannel.id) {
        // log user joining channels
        console.log('[' + utcDate + '] ' + newMember.user.username + ' joined voice channel');

        // whenever users join a channel, play intro theme
        let voiceChannel = newUserChannel;
        if (discordUser !== undefined) {
            voiceChannel.join()
                .then(connection => {
                    if (newMember.user.id == discordUser.id) { // play sound based on user
                        const dispatcher = connection.playFile(discordUser.file);
                        dispatcher.on('end', end => voiceChannel.leave());
                    }
                })
                .catch(error => {
                    voiceChannel.leave(); // kick bot if stuck
                    console.log('[' + utcDate + '] ' + error);
                });
        }
    } else if (newUserChannel === undefined) {
        // log users leaving channel
        console.log('[' + utcDate + '] ' + oldMember.user.username + ' left voice channel');
    }
})

// bot welcomes new members into server and gives them a role
bot.on('guildMemberAdd', member => {
    // add role for user
    member.addRole(config.roleID).catch(console.error);
})

bot.login(config.token);
