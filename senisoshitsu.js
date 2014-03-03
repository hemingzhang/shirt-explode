	function Canvas(canvasId, ramp, palette, distanceFunction){
		this.canvasId = canvasId;
		this.ramp = ramp;
		this.palette = palette;
		this.distanceFunction = distanceFunction;
		this.transitionLock = false;
	}

	function euclidianDistance(a1,a2,a3,b1,b2,b3) {
		return Math.sqrt(Math.pow((a1-b1),2) + Math.pow((a2-b2),2) + Math.pow((a3-b3),2));
	}

	function paddedHexString(int) {
		var hexString = int.toString(16);
		return ("00" + hexString).substring(hexString.length, hexString.length + 2);
	}
	
	function rgbDistance(r1,g1,b1,r2,g2,b2) {
		return euclidianDistance(r1,g1,b1,r2,g2,b2);
	}
	
	function uvDistance(r1,g1,b1,r2,g2,b2) {
		var u1 = (-0.147*r1) + (-0.289*g1) + (0.436*b1);
		var v1 = (0.615*r1) + (-0.515*g1) + (-0.1*b1);
		var u2 = (-0.147*r2) + (-0.289*g2) + (0.436*b2);
		var v2 = (0.615*r2) + (-0.515*g2) + (-0.1*b2);
		return euclidianDistance(u1,v1,0,u2,v2,0);
	}
		
	function selectColor(red, green, blue, colorArray, distanceFunction) {
		var minDistance = 512;
		var minIndex = 0;
		for (var i in colorArray) {
			var color = colorArray[i];
			var distance = distanceFunction(red,green,blue,color[0],color[1],color[2]);
			if (distance <= minDistance) {
				minDistance = distance;
				minIndex = i;
			}
		}
		return minIndex;
	}

	function selectCharacter(ramp, intensity) {
		var index = Math.round((intensity / 255) * (ramp.length - 1));
		return ramp[index];
	}

	function generateColorCode(r, g, b) {
		return "#" + paddedHexString(r) + paddedHexString (g) + paddedHexString(b);
	}

	function checkByteArray(byteArray) {
		if (byteArray[0] != 0x52 || byteArray[1] != 0x47 || byteArray[2] != 0x42 || byteArray[3] != 0x41) {
			alert('invalid RGBA byteArray');
			return false;
		var width = byteArray[4];
		var height = byteArray[5];
		var expectedSize = (width * height * 4) + 6;
		if (byteArray.length != expectedSize)
			alert('expected byteArray of size ' + expectedSize + ', got size ' + byteArray.length);
		}
		return true;
	}

	function generateCharacterSpan(red, green, blue, ramp, colorArray, distanceFunction) {
		var returnSpan = document.createElement('span');
		var intensity = Math.round((red + blue + green) / 3);
		returnSpan.innerText = selectCharacter(ramp, intensity);
		var color = colorArray[selectColor(red, green, blue, colorArray, distanceFunction)];
		var colorCode = generateColorCode(color[0], color[1], color[2]);
		//var colorCode = "#ffffff";
		returnSpan.setAttribute('style', 'color: ' + colorCode);
		return returnSpan;
	}

	Canvas.prototype.renderCanvas = function(byteArray) {
		if (!checkByteArray(byteArray)) return false;
		console.time('render');
		// header check
		var width = byteArray[4];
		var height = byteArray[5];
		var returnPre = document.createElement('pre');
		console.time('lel');
		for (var i = 0; i < height; i++) {
			var lineOffset = (i * (width * 4)) + 6;
			for (var j = 0; j < width; j++) {
				var offset = lineOffset + (j * 4);
				var characterSpan = generateCharacterSpan(byteArray[offset], byteArray[offset + 1], byteArray[offset + 2], this.ramp, this.palette, this.distanceFunction);
				returnPre.appendChild(characterSpan);
			}
			returnPre.appendChild(document.createTextNode("\n"));
		}
		console.timeEnd('lel');
		var oldCanvas = document.getElementById(this.canvasId).firstChild;
		document.getElementById(this.canvasId).replaceChild(returnPre, oldCanvas);
		console.timeEnd('render');
	}

	// function altGenerateCharacterSpan(red, green, blue, ramp, colorArray, distanceFunction) {
	// 	var color = colorArray[selectColor(red, green, blue, colorArray, distanceFunction)];
	// 	array.push([selectCharacter(ramp, Math.round((red + blue + green) / 3)), generateColorCode(color[0], color[1], color[2])]);
	// }

	// function altRenderCanvas(byteArray, canvasID, ramp, palette, distanceFunction) {
	// 	if (!checkByteArray(byteArray)) return false;
	// 	console.time('altRender');
	// 	array = new Array();
	// 	var width = byteArray[4];
	// 	var height = byteArray[5];
	// 	console.time('lel');
	// 	for (var i = 0; i < height; i++) {
	// 		var lineOffset = (i * (width * 4)) + 6;
	// 		for (var j = 0; j < width; j++) {
	// 			var offset = lineOffset + (j * 4);
	// 			altGenerateCharacterSpan(byteArray[offset], byteArray[offset + 1], byteArray[offset + 2], ramp, palette, distanceFunction);
	// 		}
	// 		array.push(['\n', '#000000']);
	// 	}
	// 	console.timeEnd('lel');
	// 	var thing = document.getElementById(canvasID);
	// 	var newThing = document.createElement('pre');
	// 	for(i in array) {
	// 		var shit = document.createElement('span');
	// 		shit.setAttribute('style', 'color: ' + i[1]);
	// 		shit.innerText = i[0];
	// 		newThing.appendChild(shit);
	// 	}
	// 	document.replaceChild(newThing,thing.children[0]);
	// 	console.timeEnd('altRender');
	// }

	function generateSaveImage(imageName, imagesObject, callback) {
		if(typeof(callback)==='undefined') callback = function(){};
		return function() {
			var arrayBuffer = this.response;
			if (arrayBuffer) {
				imagesObject[imageName] = new Uint8Array(arrayBuffer);
				callback();
			}
		}
	}

	function loadImage(url, imageObject, callback) {
		var req = new XMLHttpRequest();
		req.open("GET", "rendered/"+url+".rgba", true);
		console.log('fuck');
		req.responseType = "arraybuffer";

		req.onload = generateSaveImage(url, imageObject, callback);

		req.send();
	}

	function compositePoint(r1, g1, b1, r2, g2, b2, a2) {
		alpha = a2 / 255;
		return [Math.round((r1 * (1 - alpha)) + (r2 * alpha)),
				Math.round((g1 * (1 - alpha)) + (g2 * alpha)),
				Math.round((b1 * (1 - alpha)) + (b2 * alpha))];
	}

	function compositeImages(background, foreground, xOffset, yOffset) {
		if(!checkByteArray(background) || !checkByteArray(foreground)) return false;
		console.time("composite");
		var bWidth = background[4];
		var bHeight = background[5];
		var fWidth = foreground[4];
		var fHeight = foreground[5];
		returnArray = new Uint8Array(background);
		for(var i = 0; i < fHeight; i++) {
			if (yOffset + i >= bHeight) break;
			if (yOffset + i >= 0) {
				var fLineOffset = (i * fWidth * 4) + 6;
				var bLineOffset = ((i + yOffset) * bWidth * 4) + 6;
				for(var j = 0; j < fWidth; j++) {
					if ((xOffset + j) >= bWidth) break;
					if (xOffset + j >= 0) {
						var fOffset = fLineOffset + (4 * j);
						var bOffset = bLineOffset + (4 * (j + xOffset));
						var point = compositePoint(background[bOffset], background[bOffset + 1], background[bOffset + 2],
							foreground[fOffset], foreground[fOffset + 1], foreground[fOffset + 2], foreground[fOffset + 3]);
						for(var k = 0; k < 3; k++) {
							returnArray[bOffset + k] = point[k];
						}
					}
				}
			}
		}
		console.timeEnd("composite");
		return returnArray;
	}

	function generateDeltaArray(byteArray1, byteArray2) {
		console.log('shi');
		if (!checkByteArray(byteArray1)) return false;
		if (!checkByteArray(byteArray2)) return false;
		console.log('shit');
		if ((byteArray1[4] != byteArray2[4]) || (byteArray1[5] != byteArray2[5])) return false;
		console.log('shits');
		var returnArray = new Array();
		for (var i = 6; i < byteArray1.length; i+=4) {
			for (var j = 0; j < 3; j++) {
				if(byteArray1[i+j] != byteArray2[i+j]) {
					returnArray.push((i-6)/4);
					break;
				}
			}
		}
		return returnArray;
	}

	Canvas.prototype.shittyTransitionStep = function(newImage, deltaArray, number) {
		if (deltaArray.length === 0) {
			console.log('dine');
			return false;
		}
		if (deltaArray.length < number) number = deltaArray.length;
		console.log('fuck');
		for(var i = 0; i < number; i++) {
			var pointID = deltaArray.shift();
			var oldPoint = document.getElementById(this.canvasId).children[0].children[pointID];
			oldPoint.innerText = selectCharacter(this.ramp, Math.round((newImage[pointID*4 + 6] + newImage[pointID*4 + 7] + newImage[pointID*4 + 8])/3));
			var color = this.palette[selectColor(newImage[pointID*4 + 6], newImage[pointID*4 + 7], newImage[pointID*4 + 8], this.palette, this.distanceFunction)];
			var colorCode = generateColorCode(color[0], color[1], color[2]);
			oldPoint.setAttribute('style', 'color: '+colorCode);
		}
	}

	Canvas.prototype.shittyTransition = function(oldImage, newImage, speedFactor) {
		if (document.getElementById(this.canvasId).children[0].children.length != ((newImage.length - 6)/4)) return false;
		var deltaArray = generateDeltaArray(oldImage, newImage);
		var numberPoints = Math.round(deltaArray.length * speedFactor / 20);
		var shittyInterval = setInterval((function(){
			if(this.shittyTransitionStep(newImage, deltaArray, numberPoints) === false) clearInterval(shittyInterval);
		}).bind(this), 4);
		return shittyInterval;
	}