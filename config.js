module.exports = {
    tokenDelimiter: ':',

    WORKSPACE_ID_LEN: 10,
    
    untitled_workspace: 'Untitled Workspace',
    
    default_workspace_avatar: '', //base64 image encoding
    
    anonymous_attendee: 'Anonymous Attendee',
    
    default_attendee_avatar: '', //base64 image encoding
    
    https: {
        key: '', //full path to the required file
        cert: '', //full path to the required file
        ca: '' //full path to the required file
    },
    
    json_storage_file: '',
    
    max_capacity_of_workspace: 4, //maximum number of attendees allowed per workspace
};