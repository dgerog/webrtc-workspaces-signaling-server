const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');

const config = require('../config');

class Workspace {
    constructor() {
        //read json file
        if (fs.existsSync(config.json_storage_file)) {
            const data = fs.readFileSync(config.json_storage_file);
            this.workspaces = JSON.parse(data);
        }
        else
            this.workspaces = {};
    };
    sign (id, code) {
        const singningToken = bcrypt.hashSync(id + config.tokenDelimiter + code + config.tokenDelimiter + process.env.SALT_STRING, 10);
        const token = jwt.sign(
            { 
                id: id,
                singningToken: singningToken
            }, 
            process.env.MAGICK_TOKEN
        );
        return(token);
    };
    getAccessToken (id, code, owner) {
        const singningToken = bcrypt.hashSync(id + config.tokenDelimiter + code + config.tokenDelimiter + process.env.SALT_STRING, 10);
        const token = jwt.sign(
            { 
                id: id,
                owner: owner,
                singningToken: singningToken
            }, 
            process.env.MAGICK_TOKEN
        );
        return(token);
    };
    verify (code, token) {
        try {
            const decodedTok = jwt.verify(token, process.env.MAGICK_TOKEN);
            return({
                workspace: {
                    id: decodedTok.id,
                    owner: decodedTok.owner,
                },
                accessAllowed: bcrypt.compareSync((decodedTok.id + config.tokenDelimiter + code + config.tokenDelimiter + process.env.SALT_STRING), decodedTok.singningToken)
            });
        }
        catch(ex) {
            return ({
                workspace: {id: null},
                accessAllowed: false
            });
        }

    };
    checkAccessToken (data, isOwner = false) {
        if (typeof data.workspace === "undefined" || typeof data.workspace.id !== "string" || !data.workspace.id.length || data.workspace.id[0] != "_") {
            return ('Please provide a valid workspace ID.');
        }
        else if (typeof data.attendee === "undefined" || typeof data.attendee.id !== "string" || !data.attendee.id.length || data.attendee.id[0] != "_") {
            return('Please provide a valid workspace ID.');
        }
        else {
            try {
                const decodedTok = jwt.verify(data.accessToken, process.env.MAGICK_TOKEN);
                if (decodedTok.id != data.workspace.id) {
                    return('Invalid access token. Access is not allowed.');
                }
                //check if access token is valid
                if (!bcrypt.compareSync((data.workspace.id + config.tokenDelimiter + data.attendee.id + config.tokenDelimiter + process.env.SALT_STRING), decodedTok.singningToken))
                    return('Invalid access token. Access is not allowed.');
                if (isOwner && decodedTok.owner != data.attendee.id)
                    return('Anauthorized operation. Abort.');
            }
            catch(ex) {
                return('Please provide a valid workspace token.');
            }
        }
        return('');
    };
    append (ws) {
        if (typeof ws.id !== "string")
            throw "Invalid workspace object. Abort.";
        this.workspaces[ws.id] = ws;
        if (config.json_storage_file != '')
            fs.writeFileSync(config.json_storage_file, JSON.stringify(this.workspaces));
    };
    remove (workspaceID) {
        if (this.workspaces[workspaceID] !== "undefined")
            delete this.workspaces[workspaceID]
        if (config.json_storage_file != '')
            fs.writeFileSync(config.json_storage_file, JSON.stringify(this.workspaces));
    };
    get (workspaceID) {
        return(this.workspaces[workspaceID]);
    };
};

module.exports = Workspace;