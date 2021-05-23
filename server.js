const VERSION = "1.0.0";

const express = require('express');
const envir = require('dotenv');
const fs = require('fs');
const path = require('path');

const config = require('./config');

const Workspace = new require('./models/Workspace');

// Configure Environment
envir.config(); 

// Create the app
const app = express();

// Declare public folder
app.use(express.static('public'));

//default route
app.get('/', (req, resp) => {
    //use this route as a plain PING event to make sure your Signaling Server is up and running
    resp.sendFile(path.join(__dirname + '/public/index.html'));
});


// start server
const date = new Date();
const server = (
    process.env.ENABLE_HTTPS == 'true'
    
    ?

    require('https') // SECURE CONNECTION
    .createServer(
        {
            key : fs.readFileSync(config.https.key),
            cert: fs.readFileSync(config.https.cert),
            ca  : fs.readFileSync(config.https.ca),
        },
        app
    )
    .listen(process.env.PORT, () => {
        console.log(`-----------------------------------------------------------------------`);
        console.log(`           webRTC Workspaces Signaling Server                          `);    
        console.log(`>>> Signaling Server is up and running via HTTPS!                      `);
        console.log(`>>> Version       : ${VERSION}                                         `);
        console.log(`>>> Listening Port: ${process.env.PORT}                                `);
        console.log(`>>> Dev Mode      : ${process.env.DEVELOPMENT}                         `);
        console.log(`>>> Started On    : ${date.toString()}                                 `);
        console.log(`-----------------------------------------------------------------------`);
    })

    :
    
    require('http') // NON SECURE CONNECTION
    .createServer(app)
    .listen(process.env.PORT, () => {
        console.log(`-----------------------------------------------------------------------`);
        console.log(`           webRTC Workspaces Signaling Server                          `);
        console.log(`>>> Signaling Server is up and running via HTTP!                       `);
        console.log(`>>> Version       : ${VERSION}                                         `);
        console.log(`>>> Listening Port: ${process.env.PORT}                                `);
        console.log(`>>> Dev Mode      : ${process.env.DEVELOPMENT}                         `);
        console.log(`>>> Started On    : ${date.toString()}                                 `);
        console.log(`-----------------------------------------------------------------------`);
        console.log(`IMPORTANT: NON SECURE CONNECTIONING IS ACTIVATED!                      `);
        console.log(`           SET ENV VAR ENABLE_HTTPS TO TRUE TO ENABLE                  `);
        console.log(`           SSL ENCRYPTION AND SERVE REQUESTS VIA HTTPS.                `);
        console.log(`           MAKE SURE YOU ADD THE REQUIRED PATHS IN config.js FILE      `);
        console.log(`-----------------------------------------------------------------------`);
    })
);



//
// Handle webRTCWorkspaces Signaling Server
//
const workspaceModel = new Workspace();
const randomstring = require('randomstring');
const io = require('socket.io')(
    server, 
    { 
        pingTimeout: 12000,
        agent: false,
        origins: '*:*'
    }
);
io.on('connection', (socket) => {
    socket
    //
    // ICE Messages
    //
    .on('iceservers', () => {
        if (process.env.DEVELOPMENT == "true") {
            /*
                IMPORTANT: Put here your code for STUN/TURN servers!
                Initializing default with Google free STUN. This will work probably
                ONLY in local networks!

                DEBUGGING ONLY
            */            
            const iceServers = [
                {url: "stun:stun.l.google.com:19302"},
                {url: "stun:stun1.l.google.com:19302"},
                {url: "stun:stun2.l.google.com:19302"},
                {url: "stun:stun3.l.google.com:19302"},
                {url: "stun:stun4.l.google.com:19302"},
            ];
            socket.emit(
                'iceservers', //inform attendee
                iceServers
            );
        }
        else {
            /*
                Twilio Integration - Production
                IMPORTANT: Charges apply!!!!
            */
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const client = require('twilio')(accountSid, authToken);

            client.tokens.create()
            .then((token) => {
                socket.emit(
                    'iceservers', //inform attendee
                    token.iceServers
                );
                console.log(`|---> ICE servers (Timestamp: ${date.getTime()})                       `);
                console.log(`| > SOCKET ID: ${socket.id}                                            `);
                console.log(`| > IP: ${socket.request.connection.remoteAddress}                     `);
                console.log(`-----------------------------------------------------------------------`);
            });
        }
    })
    .on('icecandidate', (data) => {
        /*const accessError = workspaceModel.checkAccessToken(data);
        if (accessError != '') {
            console.log(`|---> Access Error / ICECANDIDATE `);
            console.log(data);
            console.log(`-----------------------------------------------------------------------`);
            socket.emit(
                'alert', //inform attendee
                accessError
            );
            return;
        }*/
        const ws = workspaceModel.get(data.workspace.id);
        if (typeof ws === "undefined") {
            socket.emit(
                'destroyed', //inform attendee
                {}
            );
            return;
        }
        io.to(ws.socketMap[data.attendee.id]).emit(
            'icecandidate', //inform attendees
            {
                attendee: {
                    id: data.attendee.id,
                },
                broadcaster: data.broadcaster,
                candidate: data.candidate,
            }
        );
    })
    .on('negotiation', (data) => {
        /*const accessError = workspaceModel.checkAccessToken(data);
        if (accessError != '') {
            console.log(`|---> Access Error / NEGOTIATION `);
            console.log(data);
            console.log(`-----------------------------------------------------------------------`);
            socket.emit(
                'alert', //inform attendee
                accessError
            );
            return;
        }*/
        const ws = workspaceModel.get(data.workspace.id);
        if (typeof ws === "undefined") {
            socket.emit(
                'destroyed', //inform attendee
                {}
            );
            return;
        }
        io.to(ws.socketMap[data.attendee.id]).emit(
            'negotiation', //inform attendees
            {
                attendee: data.broadcaster,
                message: data.message,
            }
        );

        console.log(`|---> New Negotiation (Timestamp:  ${date.getTime()})                  `);
        console.log(`| > SOCKET ID: ${ws.socketMap[data.attendee.id]}                       `);
        console.log(`| > WORKSPACE ID: ${data.workspace.id}                                 `);
        console.log(`| > TYPE: ${data.message.type}                                         `);
        console.log(`| > DATA: ${JSON.stringify(data.message.data)}                         `);
        if (process.env.DEVELOPMENT == "true") {
            console.log(data);
        }
        console.log(`-----------------------------------------------------------------------`);
    })

    //
    // webRTCWorkspaces Core Events
    //
    //worspace management
    .on('create', (data) => {
        const attendee = {
            id: (typeof data.attendee.id === "string" && data.attendee.id.length > 2 && data.attendee.id[0] == "_" ? data.attendee.id : ('_' + randomstring.generate(config.WORKSPACE_ID_LEN))),
            name: (typeof data.attendee.name === "string" && data.attendee.name.length ? data.attendee.name : config.anonymous_attendee),
            avatar: (typeof data.attendee.avatar === "string" && data.attendee.avatar.length ? data.attendee.avatar : config.default_attendee_avatar),
        };
        const workspace = {
            id: (typeof data.workspace.id === "string" && data.workspace.id.length > 2 && data.workspace.id[0] == "_" ? data.workspace.id : ('_' + randomstring.generate(config.WORKSPACE_ID_LEN))),
            name: (typeof data.workspace.name === "string" && data.workspace.name.length ? data.workspace.name : config.untitled_workspace),
            avatar: (typeof data.workspace.avatar === "string" && data.workspace.avatar.length ? data.workspace.avatar : config.default_workspace_avatar),
            owner: attendee.id,
            created: new Date().getTime(),
        };
        //sign workspace
        workspace.token = workspaceModel.sign(
            workspace.id,
            (typeof data.workspace.pin === "string" && data.workspace.pin.length ? data.workspace.pin : ''),
            attendee.id
        );
        //initialize attendees list with owner
        workspace.attendees = {
            [attendee.id]: attendee
        };
        //initialize socket mapping
        workspace.socketMap = {};
        workspace.socketMap[attendee.id] = socket.id; //add host as the first attendee

        //register workspace
        workspaceModel.append(workspace);

        socket.emit(
            'created', //inform attendee
            {
                workspace: {
                    id: workspace.id,
                    name: workspace.name,
                    avatar: workspace.avatar,
                    owner: workspace.owner,
                    created: workspace.created,
                    token: workspace.token,
                },
                attendee: attendee,
                accessToken: workspaceModel.getAccessToken(workspace.id, attendee.id, workspace.owner),
                nonce: data.nonce ? data.nonce : '',
            }
        );
        socket.join(workspace.id); //join the workspace socket

        console.log(`|---> Workspace Created (Timestamp:  ${date.getTime()})                `);
        console.log(`| > SOCKET ID: ${socket.id}                                            `);
        console.log(`| > WORKSPACE ID: ${workspace.id}                                      `);
        console.log(`| > WORKSPACE NAME: ${workspace.name}                                  `);
        if (process.env.DEVELOPMENT == "true") {
            console.log(data);
        }
        console.log(`-----------------------------------------------------------------------`);
    })
    .on('destroy', (data) => {
        const accessError = workspaceModel.checkAccessToken(data, true);
        if (accessError != '') {
            console.log(`|---> Access Error / DESTROY `);
            console.log(data);
            console.log(`-----------------------------------------------------------------------`);
            socket.emit(
                'alert', //inform attendee
                accessError
            );
            return;
        }
        
        //access granted
        workspaceModel.remove(data.workspace.id);
        
        socket.to(data.workspace.id).emit(
            'destroyed', //inform other participants
            {}
        );
        socket.emit(
            'destroyed', //inform attendee
            {}
        );
        socket.leave(data.workspace.id);
        console.log(`|---> Workspace Dectivated (Timestamp:  ${date.getTime()})             `);
        console.log(`| > SOCKET ID: ${socket.id}                                            `);
        console.log(`| > WORKSPACE ID: ${data.workspace.id}                                 `);
        if (process.env.DEVELOPMENT == "true") {
            console.log(data);
        }
        console.log(`-----------------------------------------------------------------------`);
    })
    .on('attend', (data) => {
        if (typeof data.workspace.token !== "string" || !data.workspace.token.length) {
            socket.emit(
                'alert',
                'Please provide a valid workspace access token.'
            );
            return;
        }
        
        //attendee wishes to join a workspace ~ validate
        const auth = workspaceModel.verify(
            (typeof data.workspace.pin === "string" && data.workspace.pin.length ? data.workspace.pin : '') , 
            data.workspace.token
        );
        if (!auth.accessAllowed) {
            //invalid access
            socket.emit(
                'alert',
                'This workspace is protected with a PIN. Wrong PIN provided.'
            );
            return;
        }
        
        const ws = workspaceModel.get(auth.workspace.id);
        if (typeof ws === "undefined") {
            socket.emit(
                'destroyed', //inform attendee
                {}
            );
            return;
        }

        //is ws full? (unless is owner)
        if (ws.owner != data.attendee.id && Object.keys(ws.attendees).length >= config.max_capacity_of_workspace) {
            socket.emit(
                'full', //inform attendee
                {}
            );
            return;
        }

        //access granted
        const attendee = {
            id: (typeof data.attendee.id === "string" && data.attendee.id.length > 2 && data.attendee.id[0] == "_" ? data.attendee.id : ('_' + randomstring.generate(config.WORKSPACE_ID_LEN))),
            name: (typeof data.attendee.name === "string" && data.attendee.name.length ? data.attendee.name : config.anonymous_attendee),
            avatar: (typeof data.attendee.avatar === "string" && data.attendee.avatar.length ? data.attendee.avatar : config.default_attendee_avatar),
        };
        socket.join(auth.workspace.id);
        //append new attendee in attendees list
        ws.attendees[attendee.id] = attendee;
        //append new socket id socket mapping
        ws.socketMap[attendee.id] = socket.id;
        workspaceModel.append(ws);

        socket.emit(
            'attendance-granted', //inform attendee
            {
                workspace: {
                    id: ws.id,
                    name: ws.name,
                    avatar: ws.avatar,
                    owner: ws.owner,
                    created: ws.created,
                    token: ws.token,
                    call: ws.call ? ws.call : null,
                },
                attendee: attendee,
                attendees: ws.attendees,
                accessToken: workspaceModel.getAccessToken(auth.workspace.id, attendee.id, ws.owner),
                nonce: data.nonce ? data.nonce : '',
            }
        );
        socket.to(auth.workspace.id).emit(
            'attend', //inform other participants
            attendee
        );
        console.log(`|---> Attendee joined (Timestamp:  ${date.getTime()})                  `);
        console.log(`| > SOCKET ID:  ${socket.id}                                           `);
        console.log(`| > ATTENDEE ID:  ${attendee.id}                                       `);
        console.log(`| > ATTENDEE NAME:  ${attendee.name}                                   `);
        console.log(`| > WORKSPACE ID: ${auth.workspace.id}                                 `);
        if (process.env.DEVELOPMENT == "true") {
            console.log(data);
        }
        console.log(`-----------------------------------------------------------------------`);
    })
    .on('re-attend', (data) => {
        //restoring attendance session
        const accessError = workspaceModel.checkAccessToken(data);
        if (accessError != '') {
            console.log(`|---> Access Error / RE-ATTEND `);
            console.log(data);
            console.log(`-----------------------------------------------------------------------`);
            socket.emit(
                'alert', //inform attendee
                accessError
            );
            return;
        }
        

        const ws = workspaceModel.get(data.workspace.id);
        if (typeof ws === "undefined") {
            socket.emit(
                'destroyed', //inform attendee
                {}
            );
            return;
        }

        //access granted
        const attendee = {
            id: (typeof data.attendee.id === "string" && data.attendee.id.length > 2 && data.attendee.id[0] == "_" ? data.attendee.id : ('_' + randomstring.generate(config.WORKSPACE_ID_LEN))),
            name: (typeof data.attendee.name === "string" && data.attendee.name.length ? data.attendee.name : config.anonymous_attendee),
            avatar: (typeof data.attendee.avatar === "string" && data.attendee.avatar.length ? data.attendee.avatar : config.default_attendee_avatar),
            socket: socket.id,
        };
        socket.join(data.workspace.id);
        //append new attendee in attendees list
        ws.attendees[attendee.id] = attendee;
        workspaceModel.append(ws);

        socket.emit(
            're-attendance-granted', //inform attendee
            {
                workspace: {
                    id: ws.id,
                    name: ws.name,
                    avatar: ws.avatar,
                    owner: ws.owner,
                    created: ws.created,
                    token: ws.token,
                },
                attendee: attendee,
                attendees: ws.attendees,
                accessToken: workspaceModel.getAccessToken(data.workspace.id, attendee.id, ws.owner),
                nonce: data.nonce ? data.nonce : '',
                call: ws.call ? ws.call : null,
            }
        );
        socket.to(data.workspace.id).emit(
            'attend', //inform other participants
            attendee
        );
        console.log(`|---> Attendee re-joined (Timestamp:  ${date.getTime()})                  `);
        console.log(`| > SOCKET ID:  ${socket.id}                                           `);
        console.log(`| > ATTENDEE ID:  ${attendee.id}                                       `);
        console.log(`| > WORKSPACE ID: ${data.workspace.id}                                 `);
        if (process.env.DEVELOPMENT == "true") {
            console.log(data);
        }
        console.log(`-----------------------------------------------------------------------`);
    }) 
    .on('leave', (data) => {
        const accessError = workspaceModel.checkAccessToken(data);
        if (accessError != '') {
            console.log(`|---> Access Error / LEAVE `);
            console.log(data);
            console.log(`-----------------------------------------------------------------------`);
            socket.emit(
                'alert', //inform attendee
                accessError
            );
            return;
        }
        
        //attendee is leaving workspace (//make sure workspace exists)
        const ws = workspaceModel.get(data.workspace.id);
        if (typeof ws === "undefined") {
            socket.emit(
                'destroyed', //inform attendee
                {}
            );
            return;
        }
        
        //owner cannot leave SIMPLY destroy
        if (ws.owner == data.attendee.id) {
            socket.emit(
                'alert', //inform attendee
                'Workspace owner cannot leave. Only shutdown is allowed.'
            );
            return;
        }

        socket.to(data.workspace.id).emit(
            'leave', //inform other participants
            data.attendee
        );
        socket.leave(data.workspace.id);

        //attendee is leaving, update list
        delete ws.attendees[data.attendee.id];
        delete ws.socketMap[data.attendee.id];
        workspaceModel.append(ws);

        console.log(`|---> Attendee left (Timestamp:  ${date.getTime()})                    `);
        console.log(`| > SOCKET ID:  ${socket.id}                                           `);
        console.log(`| > ATTENDEE ID: ${data.attendee.id}                                   `);
        console.log(`| > WORKSPACE ID: ${data.workspace.id}                                 `);
        if (process.env.DEVELOPMENT == "true") {
            console.log(data);
        }
        console.log(`-----------------------------------------------------------------------`);
    })
    .on('kick', (data) => {
        const accessError = workspaceModel.checkAccessToken(data, true);
        if (accessError != '') {
            console.log(`|---> Access Error / KICK `);
            console.log(data);
            console.log(`-----------------------------------------------------------------------`);
            socket.emit(
                'alert', //inform attendee
                accessError
            );
            return;
        }
        
        //attendee is kicked out by a workspace (//make sure workspace exists)
        const ws = workspaceModel.get(data.workspace.id);
        if (typeof ws === "undefined") {
            socket.emit(
                'destroyed', //inform attendee
                {}
            );
            return;
        }
        
        if (ws.owner == data.kickedAttendee.id) {
            socket.emit(
                'alert', //inform attendee
                'Workspace owner cannot be kicked out of workspace.'
            );
            return;
        }

        //
        socket.emit(
            'kicked', //inform client
            data.kickedAttendee
        );
        socket.to(data.workspace.id).emit(
            'kicked', //inform other participants
            data.kickedAttendee
        );

        //stop connection with kicked user's socket
        const kickedSocket = io.sockets.connected[ws.socketMap[data.kickedAttendee.id]];
        kickedSocket.leave(data.workspace.id);
        
        //attendee is leaving, update list
        delete ws.attendees[data.kickedAttendee.id];
        delete ws.socketMap[data.kickedAttendee.id];
        workspaceModel.append(ws);

        console.log(`|---> Attendee kicked (Timestamp:  ${date.getTime()})                  `);
        console.log(`| > SOCKET ID:  ${socket.id}                                           `);
        console.log(`| > ATTENDEE ID: ${data.kickedAttendee.id}                             `);
        console.log(`| > WORKSPACE ID: ${data.workspace.id}                                 `);
        if (process.env.DEVELOPMENT == "true") {
            console.log(data);
        }
        console.log(`-----------------------------------------------------------------------`);
    })
    //call management
    .on('ring', (data) => {
        //
        // start a p2p delegation (offer)
        //
        //IMPORTANT: Any participant can start a call!!!
        const accessError = workspaceModel.checkAccessToken(data);
        if (accessError != '') {
            console.log(`|---> Access Error / RING `);
            console.log(data);
            console.log(`-----------------------------------------------------------------------`);
            socket.emit(
                'alert', //inform attendee
                accessError
            );
            return;
        }
        
        const ws = workspaceModel.get(data.workspace.id);
        if (typeof ws === "undefined") {
            socket.emit(
                'destroyed', //inform attendee
                {}
            );
            return;
        }

        //update current workspace with the call data
        console.log(data);
        ws.call = data.workspace.call;
        workspaceModel.append(ws);

        //good! no call started - start new - send to each individual [BUT ONLY THOSE INSTRUCTED IN data.offer]
        io.to(ws.socketMap[data.callee.id]).emit(
            'ring', //inform other participants (with a private message - individual socket)
            {
                workspace: data.workspace,
                caller: data.attendee,
                offer: data.offer,
                call: data.call,
                nonce: data.nonce ? data.nonce : '',
            }
        );

        console.log(`|---> Ring (Timestamp:  ${date.getTime()})                             `);
        console.log(`| > SOCKET ID: ${ws.socketMap[data.callee.id]}                         `);
        console.log(`| > CALLER ID: ${data.attendee.id}                                     `);
        console.log(`| > CALLER NAME: ${data.attendee.name}                                 `);
        console.log(`| > CALLEE ID: ${data.callee.id}                                       `);
        console.log(`| > WORKSPACE ID: ${data.workspace.id}                                 `);
        if (process.env.DEVELOPMENT == "true") {
            console.log(data);
        }
        console.log(`-----------------------------------------------------------------------`);
    })
    .on('answer', (data) => {
        //
        // a peer has accepted the p2p delegation (answer)
        //
        const accessError = workspaceModel.checkAccessToken(data);
        if (accessError != '') {
            console.log(`|---> Access Error / ANSWER `);
            console.log(data);
            console.log(`-----------------------------------------------------------------------`);
            socket.emit(
                'alert', //inform attendee
                accessError
            );
            return;
        }
        
        const ws = workspaceModel.get(data.workspace.id);
        if (typeof ws === "undefined") {
            socket.emit(
                'destroyed', //inform attendee
                {}
            );
            return;
        }

        //good! reply with answer => accept call - send to each individual [BUT ONLY THOSE INSTRUCTED IN data.answer]
        io.to(ws.socketMap[data.caller.id]).emit(
            'answer', //inform other participants (with a private message - individual socket)
            {
                workspace: data.workspace,
                callee: data.attendee,
                answer: data.answer,
                call: data.call,
                nonce: data.nonce ? data.nonce : '',
            }
        );

        console.log(`|---> Answer (Timestamp:  ${date.getTime()})                           `);
        console.log(`| > SOCKET ID: ${ws.socketMap[data.caller.id]}                         `);
        console.log(`| > CALLEE ID: ${data.attendee.id}                                     `);
        console.log(`| > CALLEE NAME: ${data.attendee.name}                                 `);
        console.log(`| > CALLER ID: ${data.caller.id}                                       `);        
        console.log(`| > WORKSPACE ID: ${data.workspace.id}                                 `);
        if (process.env.DEVELOPMENT == "true") {
            console.log(data);
        }
        console.log(`-----------------------------------------------------------------------`);
    })
    .on('hangup', (data) => {
        //
        // terminate call
        //
        const accessError = workspaceModel.checkAccessToken(data);
        if (accessError != '') {
            console.log(`|---> Access Error / HANGUP `);
            console.log(data);
            console.log(`-----------------------------------------------------------------------`);
            socket.emit(
                'alert', //inform attendee
                accessError
            );
            return;
        }
        
        const ws = workspaceModel.get(data.workspace.id);
        if (typeof ws === "undefined") {
            socket.emit(
                'destroyed', //inform attendee
                {}
            );
            return;
        }
        //update current workspace with the call data
        delete ws.call;
        workspaceModel.append(ws);

        //proceed with call termination
        socket.to(data.workspace.id).emit(
            'hangup', //inform other participants
            {
                attendee: data.attendee,
                call: data.call,
            }
        );
        console.log(`|---> Hangup (Timestamp:  ${date.getTime()})                           `);
        console.log(`| > SOCKET ID:  ${socket.id}                                           `);
        console.log(`| > ATTENDEE ID: ${data.attendee.id}                                   `);
        console.log(`| > WORKSPACE ID: ${data.workspace.id}                                 `);
        if (process.env.DEVELOPMENT == "true") {
            console.log(data);
        }
        console.log(`-----------------------------------------------------------------------`);
    })
    .on('busy', (data) => {
        const accessError = workspaceModel.checkAccessToken(data);
        if (accessError != '') {
            console.log(`|---> Access Error / BUSY `);
            console.log(data);
            console.log(`-----------------------------------------------------------------------`);
            socket.emit(
                'alert', //inform attendee
                accessError
            );
            return;
        }
        
        const ws = workspaceModel.get(data.workspace.id);
        if (typeof ws === "undefined") {
            socket.emit(
                'destroyed', //inform attendee
                {}
            );
            return;
        }

        socket.to(data.workspace.id).emit(
            'busy', //inform other participants
            {
                workspace: data.workspace,
                callee: data.attendee,
                call: data.call,
            }
        );
        console.log(`|---> Busy (Timestamp:  ${date.getTime()})                             `);
        console.log(`| > SOCKET ID:  ${socket.id}                                           `);
        console.log(`| > ATTENDEE ID: ${data.attendee.id}                                   `);
        console.log(`| > WORKSPACE ID: ${data.workspace.id}                                 `);
        if (process.env.DEVELOPMENT == "true") {
            console.log(data);
        }
        console.log(`-----------------------------------------------------------------------`);
    })
    .on('mic-toggle', (data) => {
        const accessError = workspaceModel.checkAccessToken(data);
        if (accessError != '') {
            console.log(`|---> Access Error / MIC-TOGGLE `);
            console.log(data);
            console.log(`-----------------------------------------------------------------------`);
            socket.emit(
                'alert', //inform attendee
                accessError
            );
            return;
        }
        
        //attendee updated the mic state - inform others
        const ws = workspaceModel.get(data.workspace.id);
        if (typeof ws === "undefined") {
            socket.emit(
                'destroyed', //inform attendee
                {}
            );
            return;
        }    
        socket.to(data.workspace.id).emit(
            'mic-toggle', //inform other participants
            {
                attendee: data.attendee,
                state: data.state,
            }
        );
        console.log(`|---> Attendee Update Mic State (Timestamp:  ${date.getTime()})        `);
        console.log(`| > SOCKET ID:  ${socket.id}                                           `);
        console.log(`| > ATTENDEE ID: ${data.attendee.id}                                   `);
        console.log(`| > STATE: ${data.state}                                               `);
        if (process.env.DEVELOPMENT == "true") {
            console.log(data);
        }
        console.log(`-----------------------------------------------------------------------`);
    })
    .on('cam-toggle', (data) => {
        const accessError = workspaceModel.checkAccessToken(data);
        if (accessError != '') {
            console.log(`|---> Access Error / CAM-TOGGLE `);
            console.log(data);
            console.log(`-----------------------------------------------------------------------`);
            socket.emit(
                'alert', //inform attendee
                accessError
            );
            return;
        }
        
        //attendee updated the mic state - inform others
        const ws = workspaceModel.get(data.workspace.id);
        if (typeof ws === "undefined") {
            socket.emit(
                'destroyed', //inform attendee
                {}
            );
            return;
        }    
        socket.to(data.workspace.id).emit(
            'cam-toggle', //inform other participants
            {
                attendee: data.attendee,
                state: data.state,
            }
        );
        console.log(`|---> Attendee Update Mic State (Timestamp:  ${date.getTime()})        `);
        console.log(`| > SOCKET ID:  ${socket.id}                                           `);
        console.log(`| > ATTENDEE ID: ${data.attendee.id}                                   `);
        console.log(`| > STATE: ${data.state}                                               `);
        if (process.env.DEVELOPMENT == "true") {
            console.log(data);
        }
        console.log(`-----------------------------------------------------------------------`);
    })
    ;
});