	function Canvas(canvasId, ramp, palette, distanceFunction){
		this.canvasId = canvasId;
		this.ramp = ramp;
		this.palette = palette;
		this.distanceFunction = distanceFunction;
		this.deltaArray = Array();
		this.transitionLock = false;
		this.textLock = false;
		this.width = 0;
		this.height = 0;
		this.currentImage = Array();
		this.textSpeed = 4;
		this.textNumber = 2;
		this.textColor = "#ffffff";
		this.currentTextLocations = {};
	}

	function suArrayMerge(array1, array2) { // merges two sorted arrays with unique elements0
		var i = 0;
		var j = 0;
		var result = Array();
		while(i < array1.length && j < array2.length) {
			if (array1[i] < array2[j]){
				result.push(array1[i]);
				i++;
			}
			else if (array1[i] == array2[j]) {
				i++;
			}
			else if (array1[i] > array2[j]) {
				result.push(array2[j]);
				j++;
			}
		}
		if(i == array1.length) {
			result = result.concat(array2.slice(j));
		}
		else {
			result = result.concat(array1.slice(i));
		}
		return result;
	}

	function suArrayIntersection(subtrahend, subtractor) {
		var i = 0;
		var j = 0;
		var result = Array();
		while(i < subtrahend.length && j < subtractor.length) {
			if  (subtrahend[i] < subtractor[j]){
				result.push(subtrahend[i]);
				i++;
			}
			else if (subtrahend[i] == subtractor[j]) {
				i++;
				j++;
			}
			else if (subtrahend[i] > subtractor[j]) {
				j++;
			}
		}
		result = result.concat(subtrahend.slice(i));
		return result;
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
		this.width = width;
		this.height = height;
		this.currentImage = byteArray;
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

	function generateSaveImageFunction(imageName, imagesObject, callback) {
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
		req.responseType = "arraybuffer";

		req.onload = generateSaveImageFunction(url, imageObject, callback);

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
		if (!checkByteArray(byteArray1)) return false;
		if (!checkByteArray(byteArray2)) return false;
		if ((byteArray1[4] != byteArray2[4]) || (byteArray1[5] != byteArray2[5])) return false;
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

	Canvas.prototype.generateTextLocationArray = function() {
		var result = Array();
		for (i in this.currentTextLocations) {
			result = suArrayMerge(result, this.currentTextLocations[i]);
		}
		return result;
	}

	Canvas.prototype.rerenderPoint = function(pointId) {
		var oldPoint = document.getElementById(this.canvasId).children[0].children[pointId];
		oldPoint.innerText = selectCharacter(this.ramp, Math.round((this.currentImage[pointId*4 + 6] + this.currentImage[pointId*4 + 7] + this.currentImage[pointId*4 + 8])/3));
		var color = this.palette[selectColor(this.currentImage[pointId*4 + 6], this.currentImage[pointId*4 + 7], this.currentImage[pointId*4 + 8], this.palette, this.distanceFunction)];
		var colorCode = generateColorCode(color[0], color[1], color[2]);
		oldPoint.style.color = colorCode;
	}

	Canvas.prototype.shittyTransitionStep = function(number) {
		if (this.deltaArray.length === 0) {
			return false;
		}
		if (this.deltaArray.length < number) number = this.deltaArray.length;
		for(var i = 0; i < number; i++) {
			var pointId = this.deltaArray.shift();
			this.rerenderPoint(pointId);
		}
	}

	Canvas.prototype.shittyTransition = function(newImage, speedFactor, callback) {
		if (this.transitionLock || this.textLock) return false;
		if (callback === undefined) callback = function(){};
		if (document.getElementById(this.canvasId).children[0].children.length != ((newImage.length - 6)/4)) return false;
		this.transitionLock = true;
		this.deltaArray = suArrayIntersection(generateDeltaArray(this.currentImage, newImage), this.generateTextLocationArray());
		this.currentImage = newImage;
		var numberPoints = Math.max(Math.round(this.deltaArray.length * speedFactor / 20), 1);
		var shittyInterval = setInterval((function(){
			if(this.shittyTransitionStep(numberPoints) === false) {
				clearInterval(shittyInterval);
				this.transitionLock = false;
				callback();
			}
		}).bind(this), 4);
		return shittyInterval;
	}

	Canvas.prototype.insertTextChar = function(char, insertionPoint) {
		var element = document.getElementById(this.canvasId).children[0].children[insertionPoint];
		element.innerText = char;
		element.style.color = this.textColor;
	}

	Canvas.prototype.insertTextString = function(textString, insertionPoint, instant, callback) {
		if(callback === undefined) callback = function(){};
		if (instant) {
			for(var i = 0; i < textString.length; i++) {
				this.insertTextChar(textString[i], insertionPoint + i);
			}
			callback();
		}
		else {
			var i = 0;
			var interval = setInterval((function(){
				if (i >= textString.length) {
					clearInterval(interval);
					callback();
					return;
				}
				for (var j = 0; j < this.textNumber && i < textString.length; j++) {
					this.insertTextChar(textString[i], insertionPoint + i);
					i++;
				}
			}).bind(this), this.textSpeed);
		}
	}

	Canvas.prototype.insertUnwrappedText = function(textString, handle, xOffset, yOffset, instant) {
		if(this.textLock || this.transitionLock) return false;
		this.textLock = true;
		var insertionPoint = (this.width * yOffset) + xOffset;
		var cutoffLength = Math.min(textString.length, this.width - xOffset);
		var textLocation = Array();
		for (var i = 0; i < cutoffLength; i++) {
			textLocation.push(insertionPoint + i);
		}
		this.currentTextLocations[handle] = textLocation;
		this.insertTextString(textString.slice(0, cutoffLength), insertionPoint, instant, (function(){this.textLock = false;}).bind(this));
	}

	function wrapText(textString, wrapWidth) {
		var stringFragments = Array();
		var charsProcessed = 0;
		while (textString.length - charsProcessed > wrapWidth) {
			var breakPoint = charsProcessed + wrapWidth;		// the first character of the next line
			while (breakPoint >= charsProcessed) {
				if (textString[breakPoint] === ' ') break;
				breakPoint--;
			}
			if (breakPoint < charsProcessed) {
				stringFragments.push(textString.slice(charsProcessed, charsProcessed + wrapWidth));
				charsProcessed += wrapWidth;
			}
			else {
				stringFragments.push(textString.slice(charsProcessed, breakPoint));
				charsProcessed = breakPoint + 1;
			}
		}
		var remainder = textString.slice(charsProcessed);
		if (remainder.length != 0) stringFragments.push(remainder);
		return stringFragments;
	}

	Canvas.prototype.insertTextStringDispatcher = function(stringFragments, insertionPoint, offset, index, instant) {
		if(index >= stringFragments.length) {
			this.textLock = false;
			return;
		}
		this.insertTextString(stringFragments[index], insertionPoint + (index * offset), instant, (function(){
			this.insertTextStringDispatcher(stringFragments, insertionPoint, offset, index + 1, instant);
		}).bind(this));
	}

	Canvas.prototype.insertWrappedText = function(textString, handle, xOffset, yOffset, wrapWidth, lineSpacing, instant) {
		if(this.textLock || this.transitionLock) return false;
		this.textLock = true;
		// Break up the string with whitespace
		wrapWidth = Math.min(wrapWidth, this.width - xOffset);
		var stringFragments = wrapText(textString, wrapWidth);
		var availableLines = this.height - yOffset;
		var requiredLines = stringFragments.length + (stringFragments.length - 1) * lineSpacing;
		while (requiredLines > availableLines) {
			stringFragments.pop();
			requiredLines = stringFragments.length + (stringFragments.length - 1) * lineSpacing;
		}
		var insertionPoint = this.width * yOffset + xOffset;
		var lineOffset = (1 + lineSpacing) * this.width;
		textLocation = Array();
		for(var i = 0; i < stringFragments.length; i++) {
			for(var j = 0; j < stringFragments[i].length; j++) {
				textLocation.push(insertionPoint + j + (i * (lineSpacing + 1) * this.width));
			}
		}
		this.currentTextLocations[handle] = textLocation;
		this.insertTextStringDispatcher(stringFragments, insertionPoint, lineOffset, 0, instant);

	}

	Canvas.prototype.removeText = function(handle) {
		for (var i = 0; i < this.currentTextLocations[handle].length; i++) {
			var pointId = this.currentTextLocations[handle][i];
			this.rerenderPoint(pointId);
		}
		delete this.currentTextLocations[handle];
	}

	Canvas.prototype.switchPalette = function(newPalette, speedFactor, callback) {
		if(this.transitionLock) return false;
		if(callback === undefined) callback = function(){};
		this.transitionLock = true;
		this.palette = newPalette;
		var length = document.getElementById(this.canvasId).children[0].children.length;
		this.deltaArray = Array();
		for(var i = 0; i < length; i++) {
			this.deltaArray[i] = i;
		}
		this.deltaArray = suArrayIntersection(this.deltaArray, this.generateTextLocationArray());
		var numberPoints = Math.max(Math.round(this.deltaArray.length * speedFactor / 20), 1);
		var shittyInterval = setInterval((function(){
			if(this.shittyTransitionStep(numberPoints) === false) {
				clearInterval(shittyInterval);
				this.transitionLock = false;
				callback();
			}
		}).bind(this), 4);
	}

	Canvas.prototype.switchRamp = function(newRamp, speedFactor, callback) {
		if(this.transitionLock) return false;
		if(callback === undefined) callback = function(){};
		this.transitionLock = true;
		this.ramp = newRamp;
		var length = document.getElementById(this.canvasId).children[0].children.length;
		this.deltaArray = Array();
		for(var i = 0; i < length; i++) {
			this.deltaArray[i] = i;
		}
		this.deltaArray = suArrayIntersection(this.deltaArray, this.generateTextLocationArray());
		var numberPoints = Math.max(Math.round(this.deltaArray.length * speedFactor / 20), 1);
		var shittyInterval = setInterval((function(){
			if(this.shittyTransitionStep(numberPoints) === false) {
				clearInterval(shittyInterval);
				this.transitionLock = false;
				callback();
			}
		}).bind(this), 4);
	}