var express = require('express');
var app = express();
var http = require('http').createServer(app);
const webPush = require("web-push");
const {Server} = require("socket.io");
const {RtcTokenBuilder, RtcRole} = require('agora-access-token');
const axios = require('axios');
require('dotenv').config();

const io = new Server(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// middleware
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

const port = process.env.PORT || 3000;

app.get('/', function (req, res) {
    res.json({
        'message': "welcome to Gymat node server"
    });
});

http.listen(port,/* '192.168.1.29'*/, () => {
    console.log('listening on *:3000');
});


app.post("/acquire", async (req, res) => {
    const Authorization = `Basic ${Buffer.from(`${process.env.CUSTOMERID}:${process.env.CUSTOMER_SECRET}`).toString("base64")}`;
    try {
        const acquire = await axios.post(
            `https://api.agora.io/v1/apps/${process.env.APP_ID}/cloud_recording/acquire`,
            {
                cname: req.body.channel,
                uid: `${req.body.uid}`,
                clientRequest: {
                    resourceExpiredHour: 24,
                },
            },
            {headers: {Authorization, "Content-Type": "application/json"}}
        );

        res.send(acquire.data);
    } catch (e) {
        res.send(e);
    }
});

app.post("/start", async (req, res) => {
    const Authorization = `Basic ${Buffer.from(`${process.env.CUSTOMERID}:${process.env.CUSTOMER_SECRET}`).toString("base64")}`;

    // res.json(req.body)
    const appID = process.env.APP_ID;
    const resource = req.body.resource;
    const mode = req.body.mode;
    const token = req.body.token;
    try {
        const start = await axios.post(
            `https://api.agora.io/v1/apps/${appID}/cloud_recording/resourceid/${resource}/mode/${mode}/start`,
            {
                cname: req.body.channel,
                uid: `${req.body.uid}`,
                clientRequest: {
                    token: token,
                    recordingConfig: {
                        maxIdleTime: 30,
                        streamTypes: 2,
                        channelType: 0,
                        videoStreamType: 0,
                        transcodingConfig: {
                            height: 640,
                            width: 360,
                            bitrate: 500,
                            fps: 15,
                            mixedVideoLayout: 1,
                            backgroundColor: "#FFFFFF",
                        },
                    },
                    recordingFileConfig: {
                        avFileType: ["hls", "mp4"]
                    },
                    subscribeUidGroup: 0,
                    storageConfig: {
                        vendor: 1,
                        region: 21,
                        bucket: process.env.bucket,
                        accessKey: process.env.accessKey,
                        secretKey: process.env.secretKey,
                        fileNamePrefix: ["records", "videos"],
                    },
                },
            },
            {headers: {Authorization, "Content-Type": "application/json"}}
        );

        res.json(start.data);
    } catch (e) {
        res.json(e)
    }
});

app.post("/stop", async (req, res) => {
    const Authorization = `Basic ${Buffer.from(`${process.env.CUSTOMERID}:${process.env.CUSTOMER_SECRET}`).toString("base64")}`;
    const appID = process.env.APP_ID;
    const resource = req.body.resource;
    const sid = req.body.sid;
    const mode = req.body.mode;


    try {
        const stop = await axios.post(
            `https://api.agora.io/v1/apps/${appID}/cloud_recording/resourceid/${resource}/sid/${sid}/mode/${mode}/stop`,
            {
                cname: req.body.channel,
                uid: `${req.body.uid}`,
                clientRequest: {},
            },
            {headers: {Authorization, "Content-Type": "application/json"}}
        );
        res.send(stop.data);
    } catch (e) {
        res.json(e)
    }

});


app.get('/generate-token', (req, res) => {
    const channelName = req.query.channelName;
    const uid = req.query.uid || 0;
    const role = req.query.role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const expireTime = 3600;  // Token expiration time in seconds (1 hour)
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;

    if (!channelName) {
        return res.status(400).json({error: "channelName is required"});
    }

    const token = RtcTokenBuilder.buildTokenWithUid(process.env.APP_ID, process.env.APP_CERTIFICATE, channelName, uid, role, privilegeExpireTime);
    return res.json({token});
});

//start server acctions
io.on('connection', (socket) => {
    console.log('a user connected');

    //join chat rooms (gimat)
    socket.on('gimat_join_rooms', (rooms) => {
        rooms = JSON.parse(rooms);
        // var newRooms = JSON.
        rooms.forEach(room => {
            console.log("gimat_join_" + room)
            socket.join("gimat_join_" + room);
        });
        console.log(`Joined rooms: ${rooms}`);
    });

    //join chat rooms (gimat)
    socket.on('gimat_user_join', (user) => {
        socket.join("gimat_user_join_" + user);

        console.log(`Joined user: ${user}`);
    });

    //join chat rooms (gimat)
    socket.on('gimat_user_leave', (user) => {
        socket.leave("gimat_user_join_" + user);

        console.log(`leave user: ${user}`);
    });


    //join chat rooms (gimat)
    socket.on('gimat_market_join', (market) => {
        socket.join("gimat_market_join_" + market);

        console.log(`Joined market: ${market}`);
    });

    //join chat rooms (gimat)
    socket.on('gimat_market_leave', (market) => {
        socket.leave("gimat_market_join_" + market);

        console.log(`leave market: ${market}`);
    });

    //leave chat rooms 
    socket.on('gimat_leaves_rooms', (rooms) => {
        rooms = JSON.parse(rooms);
        rooms.forEach(room => {
            socket.leave("gimat_join_" + room);
        });
        // console.log(`Left rooms: ${rooms}`);
    });

    /// send and recive data 
    socket.on('gimat_one_room_send_data', (data) => {
        data = JSON.parse(data);
        // console.log(data)
        io.sockets.in("gimat_join_" + parseInt(data.room_id)).emit('gimat_one_room_receive_data', data);
        console.log('message data sent:', parseInt(data.room_id));
    });
    /// send and recive data
    socket.on('gimat_one_user_send_data', (data) => {
        data = JSON.parse(data);
        // console.log(data)

        io.sockets.in("gimat_user_join_" + parseInt(data.user_id)).emit('gimat_one_user_receive_data', data);
        // console.log('message data sent to user:', parseInt(data.user_id));
    });

    /// send and recive data
    socket.on('gimat_one_market_send_data', (data) => {
        data = JSON.parse(data);
        // console.log('message data sent to market:', data);

        io.sockets.in("gimat_market_join_" + parseInt(data.market_id)).emit('gimat_one_market_receive_data', data);
        console.log('message data sent to market:', parseInt(data.market_id));
    });

    /////////// live session ////////////
    socket.on('join_channel', (channel) => {
        socket.join("session_channel_" + channel);
        console.log(`Joined channel: ${channel}`);
    });

    socket.on('end_session_provider', (channel) => {
        io.sockets.in("session_channel_" + channel).emit('end_session');
        console.log('session ended', channel);
    });
    socket.on('session_timed_provider', (channel) => {
        io.sockets.in("session_channel_" + channel).emit('end_time_session');
        console.log('session ended', channel);
    });


    //Disconnect
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});
