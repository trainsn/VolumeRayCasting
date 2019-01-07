

var img = document.getElementById("slice");
var color = document.getElementById("color");

img.onload = render;
img.src = "./bonsai.png";
color.src = "./bonsai_tf.png"

function render(){
	var canvas = document.getElementById("canvas");
	var context = canvas.getContext("2d");

	canvas.height = img.height;
	canvas.width = img.width;

	var canvas_cl = document.getElementById("canvas_cl");
	var context_cl = canvas_cl.getContext("2d");

	canvas_cl.height = color.height;
	canvas_cl.width = color.width;

	var numPerRow = 16;
	var numPerCol = 16;
	var zSize = numPerRow * numPerCol;

	var cutCanvas = document.getElementById("cut");
	var cutContext = cutCanvas.getContext("2d");

	cutCanvas.height = img.width / numPerRow;
	cutCanvas.width = img.width / numPerRow * Math.sqrt(2);

	context.drawImage(img, 0, 0);


	var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
	var colorData = context_cl.getImageData(0, 0, canvas_cl.width, canvas_cl.height)

	var imageSize = img.width / numPerRow;

	var volumes = [];
	var colorsR = [];
	var colorsG = [];
	var colorsB = [];
	var volumeSize = (imageData.data.length/imageSize)/4;

	for(var z = 0; z < imageSize; z++){
		volumes[z] = new Uint8Array(volumeSize);
		colorsR[z] = new Uint8Array(volumeSize);
		colorsG[z] = new Uint8Array(volumeSize);
		colorsB[z] = new Uint8Array(volumeSize);
		/*for(var i = 0; i < volumeSize; i++){
			volumes[z][i] = imageData.data[(i+z*volumeSize)*4];
		}*/
	}

	for(var y = 0; y < imageSize; y++){
		for(var z = 0; z < imageSize; z++){		
			for(var x = 0; x < imageSize; x++){
				oriX = x + imageSize*(y%numPerRow);
				oriY = Math.round(y/numPerRow);
				oriZ = z; 
				volumes[z][x+y*imageSize] = imageData.data[(oriX+oriZ*imageSize*numPerRow+oriY*imageSize*imageSize*numPerRow)*4];
				colorsR[z][x+y*imageSize] = colorData.data[(oriX+oriZ*imageSize*numPerRow+oriY*imageSize*imageSize*numPerRow)*3];
				colorsG[z][x+y*imageSize] = colorData.data[(oriX+oriZ*imageSize*numPerRow+oriY*imageSize*imageSize*numPerRow)*3 + 1]
				colorsB[z][x+y*imageSize] = colorData.data[(oriX+oriZ*imageSize*numPerRow+oriY*imageSize*imageSize*numPerRow)*3 + 2]
				//volumes[z][x+y*imageSize] = imageData.data[(x+z*imageSize+y*imageSize*imageSize)*4];
			}
		}
	}

	var cutImageData = cutContext.getImageData(0, 0, cutCanvas.width, cutCanvas.height);

	var startAngle = 0;
	var startTime = Date.now();
	var turnsPerSecond = 0.1;
	
	var rayLength = img.width / numPerRow * Math.sqrt(2);
	var samplingRate = 1;
	var sampleCount = samplingRate*rayLength;
	var sampleDistance = rayLength/sampleCount;

	var squared = new Float32Array(256);
	var cubed = new Float32Array(256);

	for(var i = 0; i < 256; i++){
		squared[i] = Math.pow(i/256, 2);
	}

	for(var i = 0; i < 256; i++){
		cubed[i] = Math.pow(i/256, 3);
	}

	draw();

	function intersect(start, direction){
		var aabb = [
			[0, 0],
			[imageSize, imageSize]
		];
		
		var xSign = (1/direction[0] < 0.0) ? 1 : 0;
		var ySign = (1/direction[1] < 0.0) ? 1 : 0;
		
		var txmin = (aabb[  xSign][0] - start[0]) * (1/direction[0]);
		var txmax = (aabb[1-xSign][0] - start[0]) * (1/direction[0]);
		var tymin = (aabb[  ySign][1] - start[1]) * (1/direction[1]);
		var tymax = (aabb[1-ySign][1] - start[1]) * (1/direction[1]);
		var tmin = Math.max(txmin, tymin);
		var tmax = Math.min(txmax, tymax);

		var begin = [start[0] + direction[0]*tmin, start[1] + direction[1]*tmin];
		var end   = [start[0] + direction[0]*tmax, start[1] + direction[1]*tmax];

		var count = 0;
		if(tmin < tmax){
			count = tmax-tmin;
		}

		return [
			begin,
			end,
			~~count
		];
	}


	function draw(){

		var angle = ((Date.now()-startTime)/1000)*(2*Math.PI*turnsPerSecond)+startAngle;
		
		var increment = [Math.sin(angle)*sampleDistance, Math.cos(angle)*sampleDistance*1.4];
		var baseX = Math.sin(angle)*rayLength/2 + img.width/numPerRow/2;
		var baseY = Math.cos(angle)*rayLength/2 + img.width/numPerRow/2;
		var cosAngle = Math.cos(angle);
		var sinAngle = Math.sin(angle);

		var startXPositions = new Float32Array(~~rayLength);
		var startYPositions = new Float32Array(~~rayLength);
		var sampleCounts = new Float32Array(~~rayLength);

		for(var i = 0; i < ~~rayLength; i++){

			var pos = [
				 baseX + cosAngle*((i-rayLength/2)/rayLength)*rayLength,
				(baseY - sinAngle*((i-rayLength/2)/rayLength)*rayLength)*1.4-imageSize/5
			];

			var intersection = intersect(pos, increment);
			
			startXPositions[i] = intersection[0][0];
			startYPositions[i] = intersection[0][1];
			sampleCounts[i] = intersection[2];
		}

		var zVolume;
		var zColorR;
		var zColorG;
		var zColorB;

		for(var z = 0; z < zSize; z++){
			var imageZPos = z*cutImageData.width*4;
			zVolume = volumes[z];
			zColorR = colorsR[z];
			zColorG = colorsG[z];
			zColorB = colorsB[z];
			for(var s = 0; s < ~~rayLength; s++){
				
				var pos = [
					startXPositions[s],
					startYPositions[s]
				];

				var outputR = 0.0;
				var outputG = 0.0;
				var outputB = 0.0;
				var output = 0.0;
				var saturation = 0.0;
				var x = 0.0;
				var y = 0.0;
				var value = 0;
				var v = 0.0;
				var a = 0.0;
				
				for(var i = 1; i < sampleCounts[s]; i+=1){
					
					x = ~~(pos[0] + i*increment[0]);
					y = ~~(pos[1] + i*increment[1]);
					value = zVolume[x + y*imageSize];
					colorR = zColorR[x + y*imageSize];
					colorG = zColorG[x + y*imageSize];
					colorB = zColorB[x + y*imageSize];
					
					if(value < 50){
						continue;
					}
					
					a = squared[value];
					v = cubed[value];
					
					outputR = outputR + (1-saturation) * colorR * a;
					outputG = outputG + (1-saturation) * colorG * a;
					outputB = outputB + (1-saturation) * colorB * a;
					output =     output     + v - v*saturation;
					saturation = saturation + a - a*saturation;
					
					if(saturation >= 0.99){
						break;
					}
					
				}
				
				var index = imageZPos + s*4;
				
				cutImageData.data[index+0] = ~~(output*256);
				cutImageData.data[index+1] = ~~(output*256);
				cutImageData.data[index+2] = ~~(output*256);
				cutImageData.data[index+3] = 255;
				
			}
			
		}
		
		cutContext.putImageData(cutImageData, 0, 0);
		
		frameCount++;
		
		requestAnimationFrame(draw);
		
	}

	var samplesPerFrame = Math.round((zSize*rayLength*sampleCount)/2);
	document.getElementById("samplesPerFrame").innerHTML = samplesPerFrame.toLocaleString();

	var frameCount = 0;
	var lastFPS = Date.now();
	setTimeout(updateFPS, 1000);

	function updateFPS(){

		var timeDifference = Date.now()-lastFPS;
		lastFPS = Date.now();
		var fps = frameCount/(timeDifference/1000);
		frameCount = 0;
		document.getElementById("framesPerSecond").innerHTML = Math.round(fps);
		document.getElementById("samplesPerSecond").innerHTML = Math.round(samplesPerFrame*fps).toLocaleString();
		setTimeout(updateFPS, 1000);
		
	}
	
}








