


//const urlWriteThingView = 'https://api.thingspeak.com/update?api_key=LSR6DYUNP173QULI&field1=39&field2=1.9'

const WriteThingViewAPIKey  = 'LSR6DYUNP173QULI';
const ReadThingViewAPIKey  = 'BW0FX7K7PK7IIXRU';
var urlWriteThingViewInit = "https://api.thingspeak.com/update?api_key="

var fUploadThingViewToggle = false;

function UploadThingViewToggle() {
	if ( fUploadThingViewToggle ) {
		fUploadThingViewToggle = false;
        document.getElementById("clientUpdateServerButton").innerHTML = "ThingView - Off";	
		window.term_.io.println('\r\n' + '关闭上传 ThingView');
	} else {
		fUploadThingViewToggle = true;
        document.getElementById("clientUpdateServerButton").innerHTML = "ThingView - On";
		window.term_.io.println('\r\n' + '开启上传 ThingView');		
	}	
	document.getElementById('terminal').focus();
}

function updateThingView(str){
	
	// let t= 160;
	// let i = 16.3;
	
	// f1 = t.toString();
	// f2 = i.toString();
	
	httpRequest = new XMLHttpRequest();
	
	if (!httpRequest) {
      alert('Giving up :( Cannot create an XMLHTTP instance');
      return false;
    }
	
	//urlWrite =  urlWriteThingViewInit.concat(WriteThingViewAPIKey,"&field1=",f1,"&field2=",f2);
	urlWrite =  urlWriteThingViewInit.concat(WriteThingViewAPIKey,"&field1=",str);	
	//jQuery.getJSON(urlWrite);
	
	httpRequest.onreadystatechange = alertContents;
    httpRequest.open('GET', urlWrite);
    httpRequest.send();
	
	function alertContents() {
		if (httpRequest.readyState === XMLHttpRequest.DONE) {
			if (httpRequest.status === 200) {
			//alert(httpRequest.responseText);
			} else {
			//alert('There was a problem with the request.');
			}
		}
	}

	//delete httpRequest;
	httpRequest.delete;
	
	
	
}

