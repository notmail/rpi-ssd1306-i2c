var pngtolcd = require('png-to-lcd'),
    Oled = require('oled-ssd1306-i2c');
    font = require('oled-font-5x7');
    temporal = require('temporal');

var oled = new Oled({
	width: 128,
	height: 64,
});

var invert = true;
var timing = 1000;

function init(){

    oled.stopScroll();
    oled.clearDisplay();
    oled.update();
    oled.dimDisplay(true);

    temporal.queue([{
        delay: 1000,
        task: function(){ test_1(); }
    },{
        delay: 1000,
        task: function(){ test_2();}
    },{
        delay: 10000,
        task: function(){ 
            for(let i = 0; i < 36 ; i++){
                timing+=1000/(i*0.6+1);
                setTimeout(function(){    
                    oled.invertDisplay(invert);
                    invert=!invert;
                }, timing)
            }
        }
    }]);
}

function test_1(){
    oled.clearDisplay();
    oled.setCursor(0, 0);
    oled.writeString(font, 1, 'Launching notMAIL Application', 1, true, 2);
}

function test_2(){
    oled.clearDisplay();
    pngtolcd(__dirname + '/logo.png', true, function(err, bitmapbuf) {
        oled.buffer = bitmapbuf;
        oled.update();
    });
}

function screen_saver(){
    oled.clearDisplay();
    pngtolcd(__dirname + '/logo.png', true, function(err, bitmapbuf) {
        oled.buffer = bitmapbuf;
        oled.update();
    });
}

function new_message(title, data, sub, time){
    oled.clearDisplay();
    oled.stopScroll();

    oled.setCursor(0, 0);
    oled.writeString(font, 1, sub, 1, false, 2);
    oled.drawLine(0,9,127,9,1);

    oled.setCursor(0, 12);
    oled.writeString(font, 1, title, 1, false, 1);
    
    oled.setCursor(0, 23);
    oled.writeString(font, 1, data, 1, true, 1);

    //oled.startScroll('right', 0, 18);
}

module.exports = {
    init: init,
    new_message: new_message,
    screen_saver: screen_saver
}