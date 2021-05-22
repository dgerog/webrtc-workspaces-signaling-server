# webRTWorkspaces Signaling Server

webRTWorkspaces Signaling Server acts as the intermediate to share meta data among the video call participants (e.g. notify about an incoming call, a new call participant, etc.) and in general handles all the required information exchange in order to setup a P2P connection.

Make sure to define your .env file (use the env-sample) in order to set your server's configuration. See bellow the related section for more details.

**IMPORTANT:** STUN/TURN servers are required in order to establish P2P connections outside your local network. In this example, we use Twilio for delivering this functionality. The required API tokens can be set in the .env file (there are already related placeholders in the env-sample file). You are free to use your own solution for STUN/TURN servers. In that case, make sure you update the 'iceservers' event in order to return the STUN/TURN servers you have selected to use.

## How to use

Once you download the code (pull the branch) run:

```
npm install 
```

This, will install all the required node packages and then,

```
npm start
```

in order to start your webRTCWorkspaces Signaling Server.

By default, the webRTCWorkspaces Signaling Server listens on the 9090 port. So (assuming the URL to access your webRTCWorkspaces Signaling Server is www.example.com), to verify that your webRTCWorkspaces Signaling Server is up and running visit: www.example.com:9090 and wait for your server's reply.

**IMPORTANT:** webRTC operates ONLY through a secure communication channel. Therefore, if not testing localhost, you need to install a SSL so as your webRTCWorkspaces Signaling Server delivers content via https! [Lets Encrypt](https://letsencrypt.org/) is a good free solution. To set your  webRTCWorkspaces Signaling Server on https, you need to deactivate debug mode in your .env file and set the required paths for your certificates in the config.js file.

## The .env file

The .env file determines how your Signaling Server will operate. In the default .env file you can configure the following:

- **PORT:** The port your Signaling Server listens to. By default webRTCWorspaces uses 9090.
- **ENABLE_HTTPS:** true|false, Determine weather to use secure/encrypted (*true*) or unsecure/plain (*false*) communication. Please note that although the actual webRTC communication will be held via a secure/encryoted channel (according to webRTC specs), there is official instruction regarding the signaling communication (in fact, webRTC does not set standards for the signaling operation). However, we are strongly recommend that you should enable the secure data transmition.
- **MAGICK_TOKEN:** A random string (*with characters, numbers and symbols*), used to sign the JWT.
- **SALT_STRING:** A random string (*with characters, numbers and symbols*), used to create hashes.
- **DEVELOPMENT:** true|false, Determine if your installation is in development phase or not. In case of development phase is active, unencrpyted data transmission is used. Moreover, more logs are append to your log output. Moreover, during the developement phase, local network is assumed to be used and therefore the default STUN Google servers are used, without any TURN servers.
- **TWILIO_ACCOUNT_SID:** In case you use Twilio Global Network Traversal Service, put here your SID. This info will be used to retrive your Twiliio STUN/TURN servers. Read more about the Twilio STUN/TURN servers [here](https://www.twilio.com/stun-turn). If you are not using any TURN servers, webRTCWorkspaces will use the default free configuration for Google's STUN servers. However, in that case probably your webRTC app will be able to be used ONLY in your local network. **Please note that TURN servers are in general not free.**
- **TWILIO_AUTH_TOKEN:** In case you use Twilio Global Network Traversal Service, put here your Auth Token. This info will be used to retrive your Twiliio STUN/TURN servers. Read more about the Twilio STUN/TURN servers [here](https://www.twilio.com/stun-turn). Read more about the Twilio STUN/TURN servers [here](https://www.twilio.com/stun-turn). If you are not using any TURN servers, webRTCWorkspaces will use the default free configuration for Google's STUN servers. However, in that case probably your webRTC app will be able to be used ONLY in your local network. **Please note that TURN servers are in general not free.**

To produce your *.env* file, use the env-sample file. Open it in your favorite editor, fill in the required information and rename it as .env file.

**IMPORTANT:** If you are going to use a Git repository, make sure you exclude your newly created .env file from your git push.

## The config.js file

The config.js file is used to define various parameters of your Signaling Server. The basic difference to the .env file described above is that it doesn't hold secret information regarding your installation (e.g. access tokens) and therfore, can be pushed to your git repository.

The parameters controlled in a config.js file are:

- **tokenDelimiter:** The character used as a delimiter when the access token is produced. Default is `:`.
- **WORKSPACE_ID_LEN:** The length of a Workspace ID. Default is 10.
- **untitled_workspace:** The name used as a default string in case of an untitled workspace. By default is `Anonumous Workspace`.
- **default_workspace_avatar:** A base64 string for the default avatar of a workspace. Not currently supported.
- **anonymous_attendee:** The name used as a default string in case of an untitled user. By default is `Anonumous`.
- **default_attendee_avatar:** A base64 string for the default avatar of an attendee. Not currently supported.
- **https.key:** Full path to the SSL certificate key file. Used in case of secure data transmission.
- **https.cert:** Full path to the SSL certificate. Used in case of secure data transmission.
- **https.ca:** Full path to the CA certificate. Used in case of secure data transmission.
- **json_storage_file:** A full path of a JSON file used to locally store the meta information (local filesystem). Leave empty for no storage. Default is '' (*empty*) meaning **no** data is stored on your local filesystem and **ONLY** in memory storage is used. Thus, once your Signaling Server is restarted, ALL the meta information from previous connection is lost. Activating this option, might occur in utilizing more resources of your hosting package and thus, perhaps **higher** costs might occur.
- **max_capacity_of_workspace:** Maximum number of attendeed in a workspace. The more numbers of attendees in a video call, the larger capacity of your server is utilized. Also, in case of TURN server is used the **higher** your costs become. If a an attendee tries to access a workspace that is full the related message is sent and the connection is terminated. Default is 5. 

## The webRTCWorkspaces Signaling Server Events

In this section we are going to explain the events that are being watched by the webRTCWorkspaces Signaling Server. The webRTCWorkspaces client lib listens and handles these events.

Please note that although webRTC is a P2P connection mechanism, it still needs a central Signaling Server to controll the communication circle and allow peers to discover each other. Therefore, no actual communication data are transmitted via the Signaling Server, but only basic meta information.

The events of a webRTCWorkspaces app's circle is as follows:

### Section A: Events related to the webRTC operations

In this section we introduce the various events related to the operations of the webRTC protocol. You may find more information [here](https://webrtc.org/).

- **iceservers** This event is used to send back to the client information about the ICE Servers supported by the webRTCWorkspaces installations. You can configure/change the coding of this event in order to support your own ICE Servers (STUN/TURN). In case you are using Twilio's  Global Network Traversal Service this event is utilizing your Twilio subscription and account to return the related configuration. **Please note that TURN servers are in general not free.**

- **icecandidate** This event is used to emit the ICE Candidates of one peer to another peer, during the negotiation process.

- **negotiation**  This event is used to emit data (offers/answers) between two peers regarding the webRTC negotiation process.

### Section B: Events related to the webRTCWorkspaces app

In this section we introduce the custom events used in a webRTCWorkspaces app and are related to the life circle of the app. They are mainly used to deliver the required functionality in terms of setting up a workspace or a video call.

- **create** This is event is used to allow a peer to setup a new workspace. The required information is the name of the workspace, the PIN (in case of a password protected workspace) and the name of the host.

- **destroy** This event is used in order to shutdown a workspace. It can be triggered **ONLY** by the workspace owner (*i.e. the peer that transitted the create event*). By shutting down a workspace, all peers are instantly disconnetced, any on going call is ended and all the meta information is deleted permanently from the Signaling Server.

- **attend** This event is used to allow a peer to join an existing workspace. The required information is the access token of the workspace (*shared to the peer by the workspace owner*), the workspace PIN (*in case of a password protected workspace*) and the name of the peer. Once the peer joins a workspace and there is an ongoing call, the workspace owner will instantly send a call request (*i.e. transmit a ring event - see bellow*) to the new peer in order to attend the call.

- **re-attend** Similar to the *attend* event. Used to restore the session of an already connected peer.

- **leave** This event is used to allow a peer exit a wokspace. Leaving a workspace does not affetc the wokspace existance (even if the owner exits). Meta information is still preserved on the Signaling Server. Any ongoing call is kept alive and only the left attende meta information is permanently removed.

- **ring** This event is used to initiate the call process. It is transmite **ONLY** by the workspace owner and is directed to each peer seperatly. The event is used to transmit the required webRTC meta information (*offer*) and initiate the negotationa process.

- **answer** This event is used by a peer to accept an incoming call, proceed with the negotiation proces and transmits back the required webRTC meta information (*answer*).

- **busy** This event is used by a peer to reject an incoming call. Upon receivement from a peer thw client proceeds with the call termination process regarding this peer.

- **hangup** This event is used to terminate a call. It is transmite **ONLY** by the workspace owner and is directed to each peer seperatly. Upon receivement from a peer thw client proceeds with the call termination process with all peers.

In this section we have described ALL the incoming events of the webRTCSignaling Server. For a detailed description about the events transmitted back to the cient, pease read the documentation file of the webRTCWorkspaces client.

## Security

webRTCWorkspaces uses the JWT mecanism to sign and verify access tokens. Each event transmission is accompanied with an access token entry that is created upon the workspace creation/attend by/of a peer. The Signaling Server is verifying the access token for every incoming event before processing the actual request and if the verification fails, it sends back an *alert* event with the required message.

