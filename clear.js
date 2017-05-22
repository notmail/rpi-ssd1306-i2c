var pngtolcd = require('png-to-lcd'),
    Oled = require('oled-ssd1306-i2c');
    font = require('oled-font-5x7');
    temporal = require('temporal');

var oled = new Oled({
	width: 128,
	height: 64,
});

oled.clearDisplay();
oled.update();
oled.clearDisplay();
