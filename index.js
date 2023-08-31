const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const bodyParser = require('body-parser');
const cors = require('cors')

const app = express();
const httpServer = createServer(app);

app.use(cors())

const io = new Server(httpServer, {
    cors: {
        origin: '*',
    }
});


const port = 3001; // Change this to the desired port

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const client = new Client({
    authStrategy: new LocalAuth()
});

io.on("connection", (socket) => {
    console.log(socket.id);

    socket.on("getGroups", async () => {
        console.log("getting groups")
        try {
            const chats = await client.getChats()
            const filteredChats = chats.filter(chat => chat.isGroup);
            filteredChats.forEach(chat => console.log(chat.name))
            socket.emit("groups", filteredChats)
        } catch (error) {
            console.log(error)
        }

    })
});

client.on('qr', qr => {
    io.emit('qrCode', qr);
    console.log('qr is ready!');
    //qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    io.emit('clientReady', "Client is Ready")
    console.log('Client is ready!');
});

app.get('/ping', (req,res) => {
    res.send("pong")
})

app.get('/start', (req, res) => {
    try {
        //client.initialize();
        return res.status(200).json({ success: true, message: 'Client Started Successfully' });
    } catch (error) {
        return res.status(416).json({ success: false, message: 'Client Start Failed' });
    }

})

app.post('/addToGroup', async (req, res) => {
    const { group, contacts, invite, comment } = req.body;

    let options = null;

    if (invite === "invite") {
        options = {
            comment: comment
        }
    }

    try {

        const chats = await client.getChats();
        const myGroup = chats.find((chat) => chat.name === group);

        const delay = 30000; // 1 minute in milliseconds

        for (let contact of contacts) {

            await new Promise((resolve) => setTimeout(resolve, delay));

            let result;

            if (options) {

                result = await myGroup.addParticipants(contact, options);
            } else {
                result = await myGroup.addParticipants(contact, { autoSendInviteV4: false });

            }

            console.log(result);

            // const propertyName = `number${i}@c.us`;
            // const result = {
            //     [propertyName]: {
            //         code: 200,
            //         message: 'The participant was added successfully',
            //         isInviteV4Sent: false
            //     }
            // }

            // Emit a socket event to send the result to the client
            io.emit('result', result);
        }

        io.emit('complete', "Work Done")
    } catch (error) {
        io.emit('error', error)
        console.error(error);
    }
});


// Start the HTTP server
httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});