
	
function UploadFile() {
	

	var FileLength;
	var ChecksumStrLength = 12;
	var arr_sent_size = 258;
	var first_block_head_length = 24;
	var second_block_head_length = 8;	
	var arr_sent_size_first_frame = 256 - first_block_head_length;	
	var arr_sent_size_second_frame = 256 - second_block_head_length;		
	var arr_sent = new Uint8Array(arr_sent_size);		
	var SendDataState = 0;
	var arr_ChecksumStr;	
	var notify_frame_counter;
	var frame_timeout_count = 0;
	
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
			frame_timeout_count = 0;
			
			do 
			{
				
				switch ( SendDataState )
				{
					case 0:		// sending notify block
					
						for (i=0; i < arr_sent_size; ++i )
						{	
							arr_sent[i] = 0x00;							
						}
						
						arr_sent[0] = 0x55;
						arr_sent[1] = 0xAA;	
						
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
					
						} while ( ( (new Date).getTime() - start_time ) < 5000);	// 5 seconds	

						if ( rxMcuStr == "RcvOK" ) 
						{	
							SendDataState = 2;
							frame_timeout_count = 0;
							window.term_.io.println(' Notify Frame sent 通知帧已發送接收成功');									
						}
						else
						{	
							if ( frame_timeout_count < 2 )
							{
									if ( frame_timeout_count == 0 )
									{
										window.term_.io.println(' 1st Notify frame time out !');	
										frame_timeout_count++;
									}
									else if ( frame_timeout_count == 1 )
									{
										window.term_.io.println(' 2nd Notify frame time out !');	
										frame_timeout_count++;
									}									

							}
							else
							{
								SendDataState = 100;
								remaining_length = 0;  // make it zero in order to exit do-while loop
								rxMcuStr = "NotifyFrameTimeOut";
							}
						}
					break;
					
					
					case 1:		// Send first block
					

					
					break;
					case 2:		// Send remaining blocks
						// clear 256 sending buffers
						for (i=0; i < arr_sent_size; ++i )
						{	
							arr_sent[i] = 0;							
						}
						
						var buffer_length;
						
						if ( remaining_length > 256 )
						{
							arr_sent[0] = 0xff;
							buffer_length = 256;
						}	
						else
						{
							arr_sent[0] = remaining_length-1;
							buffer_length = remaining_length;
						
						}
													
						// fill buffer data 
						for (i=0; i < buffer_length; ++i )
						{	
							arr_sent[i+2] = val_arr[ buffer_block_ptr * 256 + i];
						}
						
						
						arr_CheckSum = 0;	
						for (i=0; i < 256; ++i )
						{	
							arr_CheckSum += arr_sent[i+2];
							arr_CheckSum = arr_CheckSum & 0xff;
						}						

						arr_sent[1] = arr_CheckSum;


						rxMcuStr = "";					
						sendNextChunk(arr_sent);
						var start_time = (new Date).getTime();						
						do
						{
							if ( rxMcuStr == "RcvOK" )
								break;
							await sleep(100);
					
						} while ( ( (new Date).getTime() - start_time ) < 5000);	// 5 seconds							
						
						if ( rxMcuStr != "RcvOK" ) 
						{	
							if ( frame_timeout_count < 2 )
							{
									if ( frame_timeout_count == 0 )
									{
										window.term_.io.println(' 1st Notify frame time out !');	
										frame_timeout_count++;
									}
									else if ( frame_timeout_count == 1 )
									{
										window.term_.io.println(' 2nd Notify frame time out !');	
										frame_timeout_count++;
									}									
							}
							else
							{
								SendDataState = 100;
								remaining_length = 0;  // make it zero in order to exit do-while loop
								rxMcuStr = "FrameTimeOut";
								break;			
							}
						}	
						else // 成功發出，進行 next  frame
						{
							window.term_.io.println(' Frame : ' + (buffer_block_ptr+1) + ' sent');		
							buffer_block_ptr++;
							frame_timeout_count = 0;
							
							if ( remaining_length > 256 )
							{
								remaining_length = remaining_length - 256;
								SendDataState = 2;
							}
							else
								remaining_length = 0;
						}

						
					break;
				
				
				}
				
				
				
			}	while ( remaining_length > 0 )
			
			if ( rxMcuStr == "NotifyFrameTimeOut" )
				window.term_.io.println('Notify frame time out !');	
			else if ( rxMcuStr == "FrameTimeOut")
				window.term_.io.println('frame frameout !');				
			else if (rxMcuStr == "RcvOK")   
				window.term_.io.println('Upload completed ! CheckSum = ' + CheckSum + ' = 0x' + CheckSum.toString(16));	

		} else 
			window.term_.io.println('Not connected to a device yet.');	   

		   
	}
	

	
		
	document.getElementById('UploadFile').value = "";	// clean it, otherwise cannot load the same file again
	

	
	
  
}





   




