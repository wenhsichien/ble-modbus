
	
function UploadFile() {
	

	var FileLength;
	var ChecksumStrLength = 12;
	var arr_sent_size = 256;
	var first_block_head_length = 24;
	var second_block_head_length = 8;	
	var arr_sent_size_first_frame = 256 - first_block_head_length;	
	var arr_sent_size_second_frame = 256 - second_block_head_length;		
	var arr_sent = new Uint8Array(arr_sent_size);		
	var SendDataState = 0;
	var arr_ChecksumStr;	
	var notify_frame_counter;
	
	var fr;
	
	// turn echo off to avoid terminal buffer crash
	if  ( fTxEchoToggle )
		TxEchoToggle();

	var UploadFile= document.getElementById('UploadFile').files[0];

	if(UploadFile)
	{
		window.term_.io.println('\r\n' + '"' + UploadFile.name + '"' + ' is loaded. File size is = ' + UploadFile.size + ' bytes' );	
		
		FileLength = UploadFile.size;

		fr = new FileReader();
			
        fr.onload = receivedBinary;
        fr.readAsBinaryString(UploadFile);
	}


	
	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	
	async function receivedBinary() {

		var result, n, aByte, byteStr, val_arr;
		
		var remaining_length;
		var buffer_block_ptr;
		
		if(bleDevice && bleDevice.gatt.connected) {
			
			result = fr.result;	

			val_arr = new Uint8Array(result.length );	
			
			CheckSum = 0;

			// store data into val_arr
			for (n = 0; n < result.length; ++n) {
				aByte = result.charCodeAt(n);

				val_arr[n] = aByte;
				
				CheckSum += aByte;
				CheckSum = CheckSum & 0xffff;
			}

			
			remaining_length = FileLength;
			buffer_block_ptr = 0;
			
			rxMcuStr = "";		
			
			//start sending buffer out
			
			SendDataState = 0;
			
			notify_frame_counter = 0;
			
			do 
			{
				
				switch ( SendDataState )
				{
					case 0:		// sending notify block
					
						for (i=0; i < arr_sent_size; ++i )
						{	
							arr_sent[i] = 0x00;							
						}
						
						arr_sent[0] = 0x5A;
						arr_sent[1] = 0x5A;	
						arr_sent[2] = 0x5A;	
						arr_sent[3] = 0x5A;	
						
						
						sendNextChunk(arr_sent);
						
						var start_time = (new Date).getTime();

						do
						{
							if ( rxMcuStr == "RcvOK" )
							break;
							await sleep(100);
							
							if ( notify_frame_counter > 0 )
							{	
									sendNextChunk(arr_sent);	
									notify_frame_counter--;
							}
					
						} while ( ( (new Date).getTime() - start_time ) < 10000);	// 10 seconds		

						if ( rxMcuStr == "RcvOK" ) 
						{	
							SendDataState = 1;
							window.term_.io.println(' Notify Frame sent 通知帧');									
						}
						else
						{	
							SendDataState = 100;
							remaining_length = 0;  // make it zero in order to exit do-while loop
							rxMcuStr = "NotifyFrameTimeOut";
							
						}
					break;
					
					
					case 1:		// Send first block
					
						for (i=0; i < arr_sent_size; ++i )
						{	
							arr_sent[i] = 0;							
						}
						
						arr_sent[0] = 0x55;
						arr_sent[1] = 0xAA;	
						arr_sent[2] = 0x55;	
						arr_sent[3] = 0xAA;	
						
						FileLengthStr=FileLength.toString();
	
						var tmp_index = 0;						
						for (n = (FileLengthStr.length-1); n >= 0; --n) {
					
							arr_sent[19 - tmp_index] = FileLengthStr.charCodeAt(n) -0x30;		// substract "0" = 0x30
							tmp_index++;

						}					

						for (i = 0; i < 4; ++i )
							arr_sent[ 20 + i ] = 0x30;	
						
						ChecksumStr=CheckSum.toString(16);	

						var aLength = ChecksumStr.length;
						
						for (i = 0; i < aLength; ++i)
							arr_sent[23-i] = ChecksumStr.charCodeAt(aLength-1-i);	
						
						//arr_sent[20] = ChecksumStr.charCodeAt(0);
						//arr_sent[21] = ChecksumStr.charCodeAt(1);
						//arr_sent[22] = ChecksumStr.charCodeAt(2);
						//arr_sent[23] = ChecksumStr.charCodeAt(3);							
									
						arr_CheckSum = 0;
						
						var buffer_length;
						
						if ( remaining_length > arr_sent_size_first_frame )
							buffer_length　= arr_sent_size_first_frame;
						else
							buffer_length　= remaining_length;	
						
						for (i=0; i < buffer_length; ++i )
						{	
							arr_sent[i + first_block_head_length] = val_arr[i];
							
						}
						
						for (i=8; i < 256; ++i )
						{	
							arr_CheckSum += arr_sent[i];
							arr_CheckSum = arr_CheckSum & 0xffff;
							
						}
				
						for (i = 0; i < 4; ++i )
							arr_sent[ 4 + i ] = 0x30;				
						var arr_ChecksumStr = arr_CheckSum.toString(16);		
						
						var aLength = arr_ChecksumStr.length;
						
						for (i = 0; i < aLength; ++i)
							arr_sent[7-i] = arr_ChecksumStr.charCodeAt(aLength-1-i);							
						//arr_sent[4] = arr_ChecksumStr.charCodeAt(0);
						//arr_sent[5] = arr_ChecksumStr.charCodeAt(1);	
						//arr_sent[6] = arr_ChecksumStr.charCodeAt(2);		
						//arr_sent[7] = arr_ChecksumStr.charCodeAt(3);						

						rxMcuStr = "";	
						buffer_block_ptr = 0;
						sendNextChunk(arr_sent);
						var start_time = (new Date).getTime();						
						do
						{
							if ( rxMcuStr == "RcvOK" )
								break;
							await sleep(100);
					
						} while ( ( (new Date).getTime() - start_time ) < 10000);	// 10 seconds			


						if ( rxMcuStr != "RcvOK" ) 
						{	
							SendDataState = 100;
							remaining_length = 0;  // make it zero in order to exit do-while loop
							rxMcuStr = "1stFrameTimeOut";
							break;			
						}
						else
							window.term_.io.println(' 1st Frame sent 第一帧');							
						
						if ( remaining_length > arr_sent_size_first_frame )
						{	
							remaining_length = remaining_length - arr_sent_size_first_frame;
							SendDataState = 2;
				
						}
						else
						{	
							remaining_length = 0;
							SendDataState = 2;	// this statement is meangless
						}	
					break;
					
					
					case 2:		// Send remaining blocks
						for (i=0; i < arr_sent_size; ++i )
						{	
							arr_sent[i] = 0;							
						}
						
						arr_sent[0] = 0x55;
						arr_sent[1] = 0xBB;	
						arr_sent[2] = 0x55;	
						arr_sent[3] = 0xBB;	
						
						arr_CheckSum = 0;
						
						var buffer_length;

						if ( remaining_length > arr_sent_size_second_frame )						
							buffer_length　= arr_sent_size_second_frame;
						else
							buffer_length　= remaining_length;							
						

						for (i=0; i < buffer_length; ++i )
						{	
							arr_sent[i+second_block_head_length] = val_arr[ buffer_block_ptr * arr_sent_size_second_frame + arr_sent_size_first_frame +  i];
							arr_CheckSum += arr_sent[i+second_block_head_length];
							arr_CheckSum = arr_CheckSum & 0xffff;
							
						}

						for (i = 0; i < 4; ++i )
							arr_sent[ 4 + i ] = 0x30;				
						var arr_ChecksumStr = arr_CheckSum.toString(16);	
						var aLength = arr_ChecksumStr.length;

						for (i = 0; i < aLength; ++i)
							arr_sent[7-i] = arr_ChecksumStr.charCodeAt(aLength-1-i);	
						　
						//arr_sent[4] = arr_ChecksumStr.charCodeAt(0);
						//arr_sent[5] = arr_ChecksumStr.charCodeAt(1);	
						//arr_sent[6] = arr_ChecksumStr.charCodeAt(2);		
						//arr_sent[7] = arr_ChecksumStr.charCodeAt(3);						

						rxMcuStr = "";					
						buffer_block_ptr++;
						sendNextChunk(arr_sent);
						var start_time = (new Date).getTime();						
						do
						{
							if ( rxMcuStr == "RcvOK" )
								break;
							await sleep(100);
					
						} while ( ( (new Date).getTime() - start_time ) < 10000);	// 10 seconds							
						
						if ( rxMcuStr != "RcvOK" ) 
						{	
							SendDataState = 100;
							remaining_length = 0;  // make it zero in order to exit do-while loop
							rxMcuStr = "FrameTimeOut";
							break;			
						}	
						else
							window.term_.io.println(' Frame : ' + (buffer_block_ptr+1) + ' sent');		

						if ( remaining_length > arr_sent_size_second_frame )
						{	
							remaining_length = remaining_length - arr_sent_size_second_frame;
							SendDataState = 2;
				
						}
						else
						{	
							remaining_length = 0;
							SendDataState = 2;	// this statement is meangless
						}
						
					break;
				
				
				}
				
				
				
			}	while ( remaining_length > 0 )
			
			if ( rxMcuStr == "NotifyFrameTimeOut" )
				window.term_.io.println('Notify frame time out !');
			else if ( rxMcuStr == "1stFrameTimeOut") 
				window.term_.io.println('1st frame time out !');	
			else if ( rxMcuStr == "FrameTimeOut")
				window.term_.io.println('frame frameout !');				
			else if (rxMcuStr == "RcvOK")   
				window.term_.io.println('Upload completed ! CheckSum = ' + CheckSum + ' = 0x' + CheckSum.toString(16));	

		} else 
			window.term_.io.println('Not connected to a device yet.');	   

		   
	}
	

	
		
	document.getElementById('UploadFile').value = "";	// clean it, otherwise cannot load the same file again
	

	
	
  
}





   




