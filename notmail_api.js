var request = require('request');
var querystring = require('querystring');
const WebSocket = require('ws');


var endpoints = {
    auth: '/notmail_api/user/auth/',
    auth_info: '/notmail_api/user/auth/info',
    sub: '/notmail_api/user/sub/',
    msg: '/notmail_api/user/msg/'
}


/*
    Notmail Class
*/

// Notmail_constructor

NotmailWeb = function (url) {
    this.url = url;
    this.session = {
        connected: false,
        token: ''
    }
    this.messages = [];
    this.subs = {};
    //this.subsDict = {};
};

// Notmail_private_methods

var getUrl = function(endpoint, query){
    if (!query) query = {};
    if (!query.token) query.token = this.session.token;
    return 'http://' + this.url + endpoint + '?' + querystring.stringify(query);
}

// Notmail_shared_methods

NotmailWeb.prototype.passwordAuthenticate = function(notmail, password, callback){
    var that = this;
    var url = getUrl.call(this, endpoints.auth, {notmail: notmail, pwd: password})        
    
    request.get(url)
    .on('data', function(data){
        data = JSON.parse(data);
        if(data.session){
            that.session.token = data.session.token;
            that.session.expiration = data.session.expiration;
            that.session.subs = data.session.subs;
            that.session.permissions = data.session.permissions
            callback(false, data.session)
        }
    })
    .on('error', function(err){
        callback(err);
    })
}


NotmailWeb.prototype.tokenAuthenticate = function(token, callback){
    var that = this;
    var url = getUrl.call(this, endpoints.auth_info, {token: token})        
    request.get(url)
    .on('data', function(data){
        data = JSON.parse(data);
        if(data.session){
            console.log('got session')
            that.session.token = data.session.token;
            that.session.expiration = data.session.expiration;
            that.session.subs = data.session.subs;
            that.session.permissions = data.session.permissions
            that.session.notmail = data.session.notmail
            wsConnect.call(that)
            callback(false, data.session)
        }
    })
    .on('error', function(err){
        callback(err);
    })
}

NotmailWeb.prototype.on = function(event, callback){
    if(event == 'disconnect')
        this.eventDisconnect = callback;
    else if(event == 'newmessage')
        this.eventMessage = callback;
    else if(event == 'newsub')
        this.eventSub = callback;
}

NotmailWeb.prototype.getMessages = function (query, callback) {
    var that = this;
    var url = getUrl.call(this, endpoints.msg, query)

    request.get({url: url, json: true}, function(err, res, body){
        if(err){
            if(res.statusCode == 401)
                that.eventDisconnect();
            callback(err);
        }else if(res.statusCode == 200){
            that.messages = body.msgs.map(function(msg){
                var msg = new Message(msg); 
                Object.defineProperty(msg, "notmail", {
                    enumerable: false,
                    writable: true
                });
                msg.notmail = that;
                return msg
            });
            callback(false, that.messages);
        }
    });
};

NotmailWeb.prototype.getSubscriptions = function (query, callback) {
    var that = this;
    var url = getUrl.call(this, endpoints.sub, query)
    request.get({url: url, json: true}, function(err, res, body){
        if(err){
            if(res.statusCode == 401) that.eventDisconnect();
            callback(err);
        }else if(res.statusCode == 200){
            body.subs.forEach(function(sub){
                that.subs[sub.sub]=new Subscription(sub);
                Object.defineProperty(that.subs[sub.sub], "notmail", {
                    enumerable: false,
                    writable: true
                });
                that.subs[sub.sub].notmail = that;
            });
            callback(false, that.subs);
        }
    })
};

/* 
    Subscriptions Class
*/

// Subscriptions_constructor

Subscription = function(sub){
    this.sub = sub.sub;
    this.app = sub.app;
    this.status = sub.status;
    this.validation = sub.validation;
    this.created = sub.created;
}

// Subscriptions_shared_methods
Subscription.prototype.show = function(){
    console.log(this.name+': '+this.status)
}

Subscription.prototype.modify = function(value, callback){
    var that = this;
    var op;

    if      (value == 'subscribe')      op = 'subscribe'
    else if (value == 'unsubscribe')    op = 'unsubscribe'
    else if (value == 'delete')         op = 'delete'
    else callback('correct values are true and false');

    var url = getUrl.call(this.notmail, endpoints.sub, {sub: this.sub, op:op })
    request.put(url)
    .on('data', function(data){
        console.log("jq: modify correct");
        callback(false, 'ok')
    })
    .on('error', function(err){
        console.log("jq: error"+JSON.stringify(err))
        if(err.status == 401) that.eventDisconnect();
        callback(err);
    })
}

/* 
    Messages Class
*/

// Messages_constructor

Message = function(msg){
    this.title = msg.title;
    this.arrival_time = msg.arrival_time;
    this.data = msg.data;
    this.id = msg.id;
    this.sub = msg.sub;
    this.read = msg.read;
}

// Messages_shared_methods
Message.prototype.show = function(){
    console.log(this.title+': '+this.data+' by: '+this.getSub().app.title+' at: '+this.arrival_time)
}

Message.prototype.delete = function(callback){
    var that = this;
    var url = getUrl.call(this.notmail, endpoints.msg, {query: 'id', id: this.id})
    
    request.delete(url)
    .on('data', function(data){
        callback(false, 'ok')
    })
    .on('error', function(err){
        if(err.status == 401) that.eventDisconnect();
        callback(err);
    })
}

Message.prototype.setRead = function(value, callback){
    var that = this;
    var op;

    if (value==false) op = 'markasnotread'
    else if (value==true) op = 'markasread'
    else callback('correct values are true and false');

    var url = getUrl.call(this.notmail, endpoints.msg, {query: 'id', id: this.id, op:op })
    request.put(url)
    .on('data', function(data){
        callback(false, 'ok')
    })
    .on('error', function(err){
        if(err.status == 401) that.eventDisconnect();
        callback(err);
    })
}

Message.prototype.getSub = function(){
    return this.notmail.subs[this.sub];
}


/*
    WebSockets
*/
var regex = {
    error: /e(?:=(.*))?/
}

function wsConnect(){
    console.log(this.url)
    ws = new WebSocket('ws://' + this.url + '/ws');
    this.ws = ws;
    var that = this;
    console.log('connecting to ws server...');

    ws.onopen = function open() {
        // Authenticate
        console.log('connected to ws')
        ws.send('token=' + that.session.token)
    };

    ws.onmessage = function incoming(data, flags) {
        var match;
        //console.log(data)
        // Check auth
        if( match = data.data.match(regex.error) ){
            console.log('error: ' + match[1])
        }

        match = data.data[0];
        // Check new message
        if( match == 'm' ){
            if (that.eventMessage) that.eventMessage();
        }
        else if( match == 's' ){
            if (that.eventSub) that.eventSub();
        }

    }

    ws.onclose = function incoming(data, flags) {
        console.log('ws closed');
        // setTimeout({
        //     wsConnect();
        // },10000)
    }
}

module.exports = NotmailWeb;