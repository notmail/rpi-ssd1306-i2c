var notmail_api = require('./notmail_api');
var display     = require('./display');
display.init();

var url = "eldoctordeldesierto.com:6060";
var token = "";

var notmail = new notmail_api(url);

var msgQueue = [];
var lastTime = Date.now();
var freeQueue = true;


notmail.on('newmessage', function(){
    actualizarListaMensajes();
})
notmail.tokenAuthenticate(token, function(err, session){
    if(err){
        console.log("Error, invalid token:"+ err);
        process.exit(0);
    }
    console.log('getting messages')
    actualizarListaMensajes(true);
})

function actualizarListaMensajes(skip){
    notmail.getSubscriptions({}, function(err, subs){
        if(err) console.log(err)
        //console.log(Object.keys(notmail.subs))

        notmail.getMessages({}, function(err, msgs){
            if(err) console.log(err)
            if(msgs.length==0) return;
            if(!skip){
                msgs = msgs.filter(function(msg){
                    return Date.parse(msg.arrival_time) > lastTime;
                })
            }
            lastTime = Date.parse(msgs[msgs.length-1].arrival_time);
            if(!skip){
                if(freeQueue){
                    showMessage(msgs.shift());
                    freeQueue = false;
                    if(msgs.length==0) return;
                }
                msgQueue = msgQueue.concat(msgs)
            }
        })
    })
}

setInterval(function(){
    if(msgQueue.length==0) {
        if(msgQueue==0 && freeQueue == false) {
            freeQueue = true;
            display.screen_saver();
        }
        return;
    }
    freeQueue = false;
    showMessage(msgQueue.shift());
    
}, 10000);

function showMessage(msg){
    console.log(msg.title+': '+msg.data+' by: '+notmail.subs[msg.sub].app.title+' at: '+msg.arrival_time)
    display.new_message(msg.title, msg.data, notmail.subs[msg.sub].app.title, msg.arrival_time);
}
console.log('running')