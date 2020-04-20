const Discord = require('discord.js');
const config = require('./config.json');
const bot = new Discord.Client();
const fetchCommentPage = require('youtube-comment-api');

bot.on('ready', () => {
    let dt = new Date();
    let utcDate = dt.toUTCString();
    console.log('[' + utcDate + '] ' + 'We logged in, boi');
    // bot.user.setGame('Half Life 3');
    // bot.user.setAvatar('./media/avatar.jpg');

});

bot.on('message', message => {
    let dt = new Date();
    let utcDate = dt.toUTCString();
    if (message.author.bot) return; // bots don't need to talk to each other
    let score;
    let d = Math.random();

    // log all messages
    if (message.content) {
        console.log('[' + utcDate + '] ' + message.author.username + ': ' + message.content);
    }


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



    // 1% chance to pepehands
    if (d < 0.01) {
        message.react(config.pepehands);
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
                let firstComment = commentPage.comments[1].text;
                if (firstComment.length < 300) return message.channel.send(firstComment); // i don't want the bot to reply with a wall of text
                else return message.reply("no one cares"); // something for now
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
        {'id': config.ownerID, 'file': './media/kungfu.mp3'},
        {'id': config.drewID, 'file': './media/jinglebells.mp3'},
        {'id': config.blueID, 'file': './media/garbage.mp3'}
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
