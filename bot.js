const Discord = require('discord.js');
const config = require('./config.json');
const bot = new Discord.Client();
const fetchCommentPage = require('youtube-comment-api');

bot.on('ready', () => {
    console.log('We logged in, boi');
    bot.user.setGame('Half Life 3');
});

bot.on('message', message => {
    if (message.author.bot) return; // bots don't need to talk to each other

    // log all messages
    if (message.content) {
        console.log(message.author + ': ' + message.content);
    }

    // something stupid
    let d = Math.random();
    if (message.content && d < 0.01) {
        message.reply('Allegedly...');
    }

    // delete last message or delete all, admin permission
    if (message.content.startsWith(config.prefix + 'delete')) {
        let adminRole = message.guild.roles.find('name', 'Admin');
        if (!message.member.roles.has(adminRole.id)) {
            return message.reply("You don't have permission to use this command, bruh");
        }
        let numberOfMsgs = 2;
        if (message.content == (config.prefix + 'delete all')) {
            numberOfMsgs = 50;
        }
        message.channel.fetchMessages({limit: numberOfMsgs})
            .then(messages => {
                message.channel.bulkDelete(messages);
                console.log('Deleting ' + numberOfMsgs + ' messages');
            })
            .catch(console.error);
    }

    // kick husken when he says something in chat (1% chance)
    if (message.author.id == config.huskenID && d < 0.1) {
        let kickMember = message.guild.member(message.author);
        kickMember.kick();
        message.channel.send('*kicked Husken*');
    }

    // the meme bot uses pls commands so delete the command after submitted
    if (message.content.startsWith('pls')) {
        message.delete()
            .then(message => console.log('Deleted message'))
            .catch(console.error);
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
            console.log('Error with the video ID');
        }
        // fetch comments via youtube-comment-api
        fetchCommentPage(videoID)
            .then(commentPage => {
                console.log(commentPage.comments[0].text);
                return message.channel.send(commentPage.comments[0].text);
            })
            .catch(error => {
                console.log('Rejected');
                return message.channel.send('No comment...');
            })
    }

    // TODO: make bot tell jokes on demand
});

bot.on('voiceStateUpdate', (oldMember, newMember) => {
    let newUserChannel = newMember.voiceChannel;
    let oldUserChannel = oldMember.voiceChannel;

    // detect when users join and leave channels.
    if (oldUserChannel === undefined && newUserChannel !== undefined) {
        // whenever users join a channel, play intro theme
        let voiceChannel = newUserChannel;
        voiceChannel.join()
            .then(connection => {
                console.log(newMember.user.username + ' joined voice channel');

                if (newMember.user.id == config.benID) { // play seinfeld for ben
                    const dispatcher = connection.playFile('./seinfeld-theme-snip.mp3');
                    dispatcher.on('end', end => voiceChannel.leave());
                } else if (newMember.user.id == config.dawnID) { // play pickle rick for dawn
                    const dispatcher = connection.playFile('./pickle-rick.mp3');
                    dispatcher.on('end', end => voiceChannel.leave());
                }
                // add more users here with else/if
            })
            .catch(error => {
                console.log(error);
            });
    } else if (newUserChannel === undefined) {
        console.log(oldMember.user.username + ' left voice channel');
    }
})

bot.login(config.token);
