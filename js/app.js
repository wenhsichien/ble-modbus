'use strict';

const bleNusServiceUUID  = '0000ffe0-0000-1000-8000-00805f9b34fb';
const bleNusCharRXUUID   = '0000ffe1-0000-1000-8000-00805f9b34fb';
const bleNusCharTXUUID   = '0000ffe1-0000-1000-8000-00805f9b34fb';
const MTU = 20;

var bleDevice;
var bleServer;
var nusService;
var rxCharacteristic;
var txCharacteristic;
var CheckSum;
var rxMcuStr;



var connected = false;
var fTxEchoToggle = false;
var ASCII_Display = true;
var fEnableListenModBus = false;


function ToggleCharDisplay(){
	
	if ( ASCII_Display ) {
		ASCII_Display = false;
        document.getElementById("clientDigitalDisplayButton").innerHTML = "十六位顯示";	
		//window.term_.io.println('\r\n' + 'Echo Off');
	} else {
		
		if ( fEnableListenModBus == false )			// 在 listen to modebus 狀態下,不允許切回去 ASCII display
		{
			ASCII_Display = true;
			document.getElementById("clientDigitalDisplayButton").innerHTML = "ASCII 顯示";
		//window.term_.io.println('\r\n' + 'Echo On');		
		}
	}	
	document.getElementById('terminal').focus();
	
}


function TxEchoToggle() {
	if ( fTxEchoToggle ) {
		fTxEchoToggle = false;
        document.getElementById("clientDisplayButton").innerHTML = "开启输入显示 Echo On";	
		window.term_.io.println('\r\n' + 'Echo Off');
	} else {
		fTxEchoToggle = true;
        document.getElementById("clientDisplayButton").innerHTML = "关闭输入显示 Echo Off";
		window.term_.io.println('\r\n' + 'Echo On');		
	}	
	document.getElementById('terminal').focus();
}


function ClrDisplay() {
	
	window.term_.clearHome();
	document.getElementById('terminal').focus();
	initContent(window.term_.io);
	
	
	//updateThingView();
}

function connectionToggle() {
    if (connected) {
        disconnect();
    } else {
        connect();
    }
    document.getElementById('terminal').focus();
}


//Modbus 相關 functions


function enable_listen_modbus(){
	if ( fEnableListenModBus == false )
	{
		
		if ( ASCII_Display == true )
			ToggleCharDisplay();		
		fEnableListenModBus = true;
		document.getElementById("ListenModBus").innerHTML = "關閉監聽 ModBus";	

		
	}
	else
	{
		fEnableListenModBus = false;
		document.getElementById("ListenModBus").innerHTML = "啟動監聽 ModBus";			
	}
	
}


var modbus_length = 8;		// 包含 2-byte CRC
var modbus_length_data = modbus_length - 2;
let id_read_command = 0x03;
let id_write_command = 0x06;
let id_echo_command = 0x08;

var modbus_tx_data_array = new Uint8Array(modbus_length);	
var modbus_rx_data_array = new Uint8Array(modbus_length);	

function process_modbus_command()
{
	if ( modbus_rx_data_array[1] == id_read_command  )
	{
		window.term_.io.print("\r\nRead Command\r\n");
		process_modbus_command_read();		
	}
	else if ( modbus_rx_data_array[1] == id_write_command )
	{
		window.term_.io.print("\r\nWrite Command\r\n");
		process_modbus_command_write();
	}
	else if ( modbus_rx_data_array[1] == id_echo_command )
	{
		window.term_.io.print("\r\nEcho Command\r\n");
		for ( let i = 0; i < modbus_length_data ; i++ )
			modbus_tx_data_array[i] = modbus_rx_data_array[i];
		generate_crc(modbus_length_data);
		sendNextChunk(modbus_tx_data_array);
	}
	else
		window.term_.io.print("\r\nUnknown Command\r\n");	
	
}	

function process_modbus_command_write(){
	

		
}

function process_modbus_command_read(){
	

		
}

function generate_crc(mod_length)
{
	var rtucrc = 0xFFFF;
	
	if ( mod_length > 0 )
	{
		for ( var index_byte = 0; index_byte < mod_length; index_byte++)
		{
			rtucrc = rtucrc^modbus_tx_data_array[index_byte];
			for ( var index_bit = 0; index_bit <= 7; index_bit++) {
				if ((rtucrc & 0x0001) != 0) {
					rtucrc = (rtucrc>>1) ^ 0xA001;
				} else {
					rtucrc = rtucrc >> 1;
				}
			}
			
		}
		modbus_tx_data_array[mod_length+1] = ( rtucrc >> 8 ) & 0xff;	
		modbus_tx_data_array[mod_length] = ( rtucrc ) & 0xff;	
	}
}


///////// End - Modbus 相關 functions ////////////////////////





// Sets button to either Connect or Disconnect
function setConnButtonState(enabled) {
    if (enabled) {
        document.getElementById("clientConnectButton").innerHTML = "断开 Disconnect";
    } else {
        document.getElementById("clientConnectButton").innerHTML = "连接 Connect";
    }
}

function connect() {
    if (!navigator.bluetooth) {
        console.log('WebBluetooth API is not available.\r\n' +
                    'Please make sure the Web Bluetooth flag is enabled.');
        window.term_.io.println('WebBluetooth API is not available on your browser.\r\n' +
                    'Please make sure the Web Bluetooth flag is enabled.');
        return;
    }
    console.log('Requesting Bluetooth Device...');
    navigator.bluetooth.requestDevice({
        //filters: [{services: []}]
        optionalServices: [bleNusServiceUUID],
        acceptAllDevices: true
    })
    .then(device => {
        bleDevice = device; 
        console.log('Found ' + device.name);
        console.log('Connecting to GATT Server...');
        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
        return device.gatt.connect();
    })
    .then(server => {
        console.log('Locate NUS service');
        return server.getPrimaryService(bleNusServiceUUID);
    }).then(service => {
        nusService = service;
        console.log('Found NUS service: ' + service.uuid);
    })
    .then(() => {
        console.log('Locate RX characteristic');
        return nusService.getCharacteristic(bleNusCharRXUUID);
    })
    .then(characteristic => {
        rxCharacteristic = characteristic;
        console.log('Found RX characteristic');
    })
    .then(() => {
        console.log('Locate TX characteristic');
        return nusService.getCharacteristic(bleNusCharTXUUID);
    })
    .then(characteristic => {
        txCharacteristic = characteristic;
        console.log('Found TX characteristic');
    })
    .then(() => {
        console.log('Enable notifications');
        return txCharacteristic.startNotifications();
    })
    .then(() => {
        console.log('Notifications started');
        txCharacteristic.addEventListener('characteristicvaluechanged',
                                          handleNotifications);
        connected = true;
        //window.term_.io.println('\r\n' + bleDevice.name + ' Connected.');
        window.term_.io.println('\r\n' + bleDevice.name + ' 已连上.');
        //nusSendString('\r');
        setConnButtonState(true);
    })
    .catch(error => {
        console.log('' + error);
        window.term_.io.println('' + error);
        if(bleDevice && bleDevice.gatt.connected)
        {
            bleDevice.gatt.disconnect();
        }
    });
}

function disconnect() {
    if (!bleDevice) {
        console.log('No Bluetooth Device connected...');
        return;
    }
    console.log('Disconnecting from Bluetooth Device...');
    if (bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
        connected = false;
        setConnButtonState(false);
        console.log('Bluetooth Device connected: ' + bleDevice.gatt.connected);
    } else {
        console.log('> Bluetooth Device is already disconnected');
    }
}

function onDisconnected() {
    connected = false;
    //window.term_.io.println('\r\n' + bleDevice.name + ' Disconnected.');
	window.term_.io.println('\r\n' + bleDevice.name + ' 已断开.');
    setConnButtonState(false);
}

function handleNotifications(event) {
    console.log('notification');
    let value = event.target.value;
    // Convert raw data bytes to character values and use these to 
    // construct a string.
    let str = "";
	
	if ( ASCII_Display )
	{
		for (let i = 0; i < value.byteLength; i++) {
			str += String.fromCharCode(value.getUint8(i));
		}
	}
	else
	{
		if ( fEnableListenModBus == true )
		{
			if ( value.byteLength <= modbus_length )
			{
				for (let i = 0; i < value.byteLength; i++) {
					modbus_rx_data_array[i] = value.getUint8(i);
				}	
				process_modbus_command();
			}
			else
				window.term_.io.println('\r\nModbus length is not macthed\r\n');
		}
		
		const chars = new Uint8Array(value.byteLength * 2 + value.byteLength);
		const alpha = 'a'.charCodeAt(0) - 10;
		const digit = '0'.charCodeAt(0);
		
		let p = 0;
		for (let i = 0; i < value.byteLength; i++) {
			
			let nibble = value.getUint8(i) >>> 4;
			chars[p++] = nibble > 9 ? nibble + alpha : nibble + digit;
			nibble = value.getUint8(i) & 0xF;
			chars[p++] = nibble > 9 ? nibble + alpha : nibble + digit;   		
			
			chars[p++]=0x20;
		}	
		str = String.fromCharCode.apply(null, chars);
				
		
	}
	

	window.term_.io.print(str);

	rxMcuStr = str;		// store it for upload_file.js

	if ( fUploadThingViewToggle )
		updateThingView(str);
}




function nusSendString(s) {
    if(bleDevice && bleDevice.gatt.connected) {
        console.log("send: " + s);
        let val_arr = new Uint8Array(s.length)
        for (let i = 0; i < s.length; i++) {
            let val = s[i].charCodeAt(0);
            val_arr[i] = val;
        }
        sendNextChunk(val_arr);
		if ( fTxEchoToggle == true ) {
			if (s =='\r')
				s +='\n';
			window.term_.io.print(s);
		}
    } else {
        window.term_.io.println('Not connected to a device yet.');
    }
}

function sendNextChunk(a) {
    let chunk = a.slice(0, MTU);
    rxCharacteristic.writeValue(chunk)
      .then(function() {
          if (a.length > MTU) {
              sendNextChunk(a.slice(MTU));
          }
      });
}



function initContent(io) {
    io.println("\r\n\
欢迎来到 曜璿東科技  BLE 串口终端机 V0.2.8 (01/24/2021)\r\n\
Copyright (C) 2019  \r\n\
\r\n\
这是采用 Chrome 70+ 浏览器的  Web BLE 操作界面, Baud rate = 9600\r\n\
\r\n\
*********************************************************\r\n\
*********************************************************\r\n\
");
}

function setupHterm() {
    const term = new hterm.Terminal();

    term.onTerminalReady = function() {
        const io = this.io.push();
        io.onVTKeystroke = (string) => {
            nusSendString(string);
        };
        io.sendString = nusSendString;
        initContent(io);
        this.setCursorVisible(true);
        this.keyboard.characterEncoding = 'raw';
    };
    term.decorate(document.querySelector('#terminal'));
    term.installKeyboard();

    term.contextMenu.setItems([
        ['Terminal Reset', () => {term.reset(); initContent(window.term_.io);}],
        ['Terminal Clear', () => {term.clearHome();}],
        [hterm.ContextMenu.SEPARATOR],
        ['GitHub', function() {
            lib.f.openWindow('https://github.com/makerdiary/web-device-cli', '_blank');
        }],
    ]);

    // Useful for console debugging.
    window.term_ = term;
}

window.onload = function() {
    lib.init(setupHterm);
};