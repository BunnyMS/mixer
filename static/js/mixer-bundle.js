// Mixer v1.201
console.log('ew mixer bundle v1.201');

function Mixer() { 
	this.context;
	this.isPlaying = false;
	this.isLoaded = false;
	this.channels = [];
	this.interface;
	this.playlist;
	this.selectors;
	this.maxChannels = 8;
	this.timerInterval = null;
	this.duration = 0;
	this.currentTime = 0;
	this.channelLevels = [[],[]];
	this.channelsActive = 0;
	this.masterGainLevel = 1;
	this.domain = 'https://www.eastwestsounds.com';
	this.bg = 'web-mixer_3@2x.jpg';
	this.$master = $('<div class="master-controls"></div>');
	this.$gain = $('<div class="master-gain"><div class="master-gain-container"><div class="master-gain-inner"><div class="knob"></div></div></div></div>');
	this.$interface = $('<div class="interface"><div class="interface-container"><img src="'+this.domain+'/images/'+this.bg+'" class="mixer-interface" /><img src="'+this.domain+'/web-mixer/images/web-mixer_spacer@2x.gif" class="mixer-spacer" /></div></div>');
	this.$media = $('<div class="media"><div class="media-container"><div class="media-title"><h4></h4><h5></h5></div><div class="duration-container"><p class="duration-current">0:00</p><p class="duration-total">0:00</p><div class="progress-bar-container"><div class="progress-track"></div><div class="progress-bar"><div class="progress-marker-container"><div class="progress-marker"></div></div></div></div></div><div class="media-controls"><div class="media-controls-container"><div class="media-rewind"></div><div class="media-play"></div><div class="media-forward"></div></div></div></div></div>');
}


Mixer.prototype.init = function() {
	var $this = this;
	this.context = new (window.AudioContext || window.webkitAudioContext)();
	var $meter = $('<div class="meters"><div class="meter-container"><div class="meter meter-left"><div class="meter-fill"></div></div><div class="meter meter-right"><div class="meter-fill"></div></div></div></div>');
	var $channels = $('<div class="channels"></div>');
	
	for(var i = 0; i < this.maxChannels; i++)
	{
		var channel = new Channel(this);
		var $channel = channel.$channel;
		channel.number = (i+1);
		$(channel.$pan).appendTo($channel);
		$(channel.$volume).appendTo($channel);
		$(channel.$mute).appendTo($channel);
		$(channel.$solo).appendTo($channel);
		$(channel.$meter).appendTo($channel);
		$this.channels.push(channel);
		$channels.append($channel);
		channel.setPan(this,0.5);
	}
	
	this.$gain.appendTo(this.$master);
	$meter.appendTo(this.$master);
	this.$interface.append(this.$media);
	this.$interface.append($channels);
	this.$interface.append(this.$master);
	this.$interface.append(this.$overlay);
	this.interface.append(this.$interface);
	
	
	var width = $this.$interface.width();
	$this.size(width);
    
    this.$interface.on('touchstart',function(e){
        document.documentElement.style.overflow = 'hidden';
    });

    $(document).on('touchend', function(e) {
        document.documentElement.style.overflow = 'auto';
    });
    
	$this.$gain.on('mousedown touchstart',function(e){
        var y = _mixerCoords(e);
        var coordStart = y;
		var lastCoord = y;
		var $gain = $(e.target).parents('.master-gain');

        $(this).on("mousemove touchmove",function(e){
            var yy = _mixerCoords(e);
            var coord = yy;
            if(coord > coordStart)
            {
                if(coord > lastCoord)
                    $this.masterGainLevel -= (coord - lastCoord) * 0.01;
                else
                    $this.masterGainLevel += (lastCoord - coord) * 0.01;
            } else {
                if(coord < lastCoord)
                    $this.masterGainLevel -= (coord - lastCoord) * 0.01;
                else
                    $this.masterGainLevel += (lastCoord - coord) * 0.01;
            }
            if($this.masterGainLevel > 2)
                $this.masterGainLevel = 2;
            else if($this.masterGainLevel > 0.98 && $this.masterGainLevel <= 1.01)
                $this.masterGainLevel = 1;
            else if($this.masterGainLevel < 0.01)
                $this.masterGainLevel = 0;
			
            lastCoord = yy;
            $this.setGain(width);
         });
	});
	
	$(document).on('mouseup touchend',function(e){
		$($this.$gain).off("mousemove touchmove");
	});
	
	this.selectors.click(function(){
		if($this.isPlaying)
			$this.stop();
		if($this.$interface.find('.mobile-overlay').is(':visible'))
			return false;
		
		$this.selectors.removeClass('active');
		$(this).addClass('active');
		var id = $(this).attr('data-id');
		$this.playlist.removeClass('selected');
		$this.playlist.filter('#'+id).addClass('selected');
		$this.load();
		
		return false;
	});
	
	this.interface.find('.media-play').click(function(){
		if(!$this.isLoaded)
			$this.load(true);
		else if(!$this.isPlaying)
			$this.play($this.currentTime);
		else 
			$this.stop();
		return false;
	});
	
	this.interface.find('.media-rewind').click(function(){
		$this.currentTime = 0;
		$this.interface.find('.duration-current').text('0:00');
		$this.interface.find('.progress-bar').css('width','0%');
		if($this.isPlaying)
			$this.stop();
		$this.play(0);
		return false;
	});
	
	this.interface.find('.media-forward').click(function(){
		if(!$this.duration)
			return false;
		
		if($this.isPlaying)
			$this.stop();
		
		$this.currentTime = 0;
		$this.interface.find('.duration-current').text($this.formatTime($this.duration));
		$this.interface.find('.progress-bar').css('width','100%');
		return false;
	});
	
    
    var isDragging = false;
    
	this.interface.find('.progress-bar-container').mousedown(function(e){
        isDragging = true;
		var $t = $(this);
        var newWidth = (e.pageX - $t.offset().left);
        
		 $t.on("mousemove",function(e){
			newWidth = (e.pageX - $t.offset().left);
			$this.interface.find('.progress-bar').css('width',newWidth+'px');
		 });
        
         $t.on("mouseup",function(e){
            $t.off("mousemove");
            if($this.isPlaying)
            {
                var width = $t.width();
                var newWidth = $this.interface.find('.progress-bar').width();
                var seconds = ((newWidth / width) * $this.duration);
                $this.stop();
                $this.play(seconds);
                $this.currentTime = seconds;
                $this.interface.find('.duration-current').text($this.formatTime($this.currentTime));
                isDragging = false;
            }
         });
        
        
		$this.interface.find('.progress-bar').css('width',newWidth+'px');
		return false;
	});
    
    this.interface.mouseup(function(){
        if(isDragging)
        {
            var $t = $this.interface.find('.progress-bar-container');
            var width = $t.width();
            var newWidth = $this.interface.find('.progress-bar').width();
            var seconds = ((newWidth / width) * $this.duration);
            $this.stop();
            $this.play(seconds);
            $this.currentTime = seconds;
            $this.interface.find('.duration-current').text($this.formatTime($this.currentTime));
            isDragging = false;
            $t.off("mousemove");
        }
    });
	
    /*
	this.interface.find('.progress-bar-container').mouseup(function(e){
		$(this).off("mousemove");
		if($this.isPlaying)
		{
			var width = $(this).width();
			var newWidth = $this.interface.find('.progress-bar').width();
			var seconds = ((newWidth / width) * $this.duration);
			$this.stop();
			$this.play(seconds);
			$this.currentTime = seconds;
			$this.interface.find('.duration-current').text($this.formatTime($this.currentTime));
		}
		return false;
	});
    */
	
	$(document).ready(function(){
		if($this.playlist.filter('.mixer-demo.selected').length)
			$this.load();
		else
			$this.setDemo($this.playlist.filter('.mixer-demo:eq(0)').addClass('selected'));
		
        /*
		$this.interface.hover(function() {
			$("body").css("overflow","hidden");
		}, function() {
			$("body").css("overflow","auto");
		});
        */
		
       
		$(window).resize(function(){
			var width = $this.$interface.width();
			$this.size(width,true);
			$this.setGain(width,true);
			$this.interface.find('input[type="range"]').rangeslider('update', true);
		});
	});
	
	$(window).load(function(){
		$this.interface.find('input[type="range"]').rangeslider({ polyfill: false });
	});
    
    // this.setGain($())
}

Mixer.prototype.size = function(width) {
	var sizes = {
		'largest':1000,
		'large':768,
		'medium':540,
		'small':480
	};
	
	for(var size in sizes)
	{
		if(sizes[size] < width)
		{
			if(!this.interface.hasClass(size))
				this.interface.addClass(size);
				
		} else if(this.interface.hasClass(size)) {
			this.interface.removeClass(size);
		}
	}
	
	var mixerWidth = 1077;
	var scale = (Math.round((width / mixerWidth)*100));
	var rounded = (((Math.ceil(scale/5)*5) + 5) * .01);
	// console.log('scale: ' + scale + ' / ' + fives);
	if(rounded > 1)
		rounded = 1;
	this.$gain.find('.master-gain-inner').css('transform','scale('+rounded+') translate(-50%, -50%)');
}
Mixer.prototype.setGain = function(width,init) {
	var deg = Math.round(this.masterGainLevel * 50);
	if(deg > 100)
		deg = 100;
	var position = 135;
	this.$gain.find('.master-gain-inner').css('background-position-y', '-'+(deg * position) + 'px');
    if(init)
        return true;
    
	for(var i = 0; i < this.channels.length; i++)
	{
		if(this.channels[i].isLoaded)
			this.channels[i].gain.gain.value = this.masterGainLevel;
	}
}
Mixer.prototype.setDemo = function($demo) {
	var title = $demo.attr('data-title') || "";
	var creator = $demo.attr('data-creator') || "";
	this.$media.find('.media-title h4').html(title);
	this.$media.find('.media-title h5').html(creator);
}
Mixer.prototype.load = function(autoPlay) {
	this.$interface.addClass('loading');
	var $this = this;
	if(this.isLoaded)
		this.destroy();
	
	$this.playlist.filter('.selected').each(function(){
		$this.channelsActive = $(this).find('.track').length;
		$this.setDemo($(this));
		var number = 0;
		$(this).find('.track').each(function(){
			$this.channels[number].init($this);
			$this.channelLevels[0].push(0);
			$this.channelLevels[1].push(0);
			$this.channels[number].load($this,$(this),autoPlay);
			number++;
		});
		
        for(var i = 0; i < $this.maxChannels; i++)
        {
            if(i + 1 <= $this.channelsActive)
                $this.channels[i].fade(0.84);
            else
                $this.channels[i].fade(0);
            $this.channels[i].setPan(this,0.5);
        }
	});
};

Mixer.prototype.destroy = function(soft) {
	console.log('destroying mixer..');
	if(this.isPlaying)
		this.stop();
	if(!soft)
	{
		for(var i = 0; i < this.channels.length; i++)
			this.channels[i].destroy();
		
		this.isLoaded = false;
		this.duration = 0;
		this.$interface.find('.track-title').text('');
		this.$interface.find('.mixer-button.mute, .mixer-button.solo').removeClass('active');
		this.$interface.find('.channel').removeClass('loaded');
	}
    
	clearInterval(this.timerInterval);
	this.channelLevels = [[],[]];
	this.currentTime = 0;
	this.$interface.find('.media-play').removeClass('is-playing');
	this.$interface.find('.progress-bar').css('width','0px');
	this.$interface.find('.meter .meter-fill').css('height','0px');
	this.$interface.find('.duration-current').text('0:00');
	this.$interface.find('.channel .volume').addClass('off');
}
Mixer.prototype.play = function(time) {
	if(!this.isLoaded || this.isPlaying)
		return false;
	else if(!time) {
		time = 0;
		this.$interface.find('.progress-bar').css('width','0px');
		this.$interface.find('.meter .meter-fill').css('height','0px');
		this.$interface.find('.duration-current').text('0:00');
	}
	
	for(var i = 0; i < this.channels.length; i++)
		this.channels[i].play(this,time);
	
	this.interface.find('.media-play').addClass('is-playing');
	this.isPlaying = true;
	this.timerInterval = setInterval(this.timer, 1000, this);
};
Mixer.prototype.stop = function() {
	for(var i = 0; i < this.channels.length; i++)
	{
		this.channels[i].stop();
		this.channelLevels[0][i] = 0;
		this.channelLevels[1][i] = 0;
	}
	
	this.$interface.find('.channel.loaded .meter .meter-fill, .master-controls .meter .meter-fill').css('height','0%');
	this.$interface.find('.media-play').removeClass('is-playing');
	this.isPlaying = false;
	clearInterval(this.timerInterval);
};

Mixer.prototype.timer = function(mixer) {
	mixer.currentTime++;
	if(mixer.currentTime >= mixer.duration)
	{
		mixer.destroy(true);
		return false;
	}
	mixer.$interface.find('.duration-current').text(mixer.formatTime(mixer.currentTime));
	var width = mixer.$interface.find('.progress-bar-container').width();
	var currentWidth = (width / mixer.duration) * mixer.currentTime;
	mixer.$interface.find('.progress-bar').css('width',((currentWidth / width) * 100).toFixed(2)+'%');
};
Mixer.prototype.formatTime = function(seconds) {
	var minutes = Math.floor(seconds / 60);
	var remainer = Math.round(seconds - minutes * 60);
	return (minutes+':'+(remainer < 10 ? '0' : '')+remainer);
}

function Channel(mixer) { 
	this.number = 0;
	this.url;
	this.audioBuffer;
	this.analyser;
	this.volumeLevel = .84;
	this.panLevel = 0;
	this.jsNode;
	this.isLoaded = false;
	this.$channel = $('<div class="channel"><h6 class="track-title"></h6></div>');
	
	this.$pan = $('<div class="pan"><div class="knob"></div></div>');
	this.$volume = $('<div class="volume off"><div class="slider-container"><input class="slider" type="range" min="0" max="1" step="0.01" value="'+this.volumeLevel+'" data-rangeslider data-orientation="vertical" /></div></div>');
	this.$mute = $('<div class="mixer-button mute"></div>');
	this.$solo = $('<div class="mixer-button solo"></div>');
	this.$meter = $('<div class="meters"><div class="meter-container"><div class="meter meter-left"><div class="meter-fill"></div></div><div class="meter meter-right"><div class="meter-fill"></div></div></div></div>');
	var $this = this;
	var $pan = this.$pan;
	
	$this.$channel.on('mousedown touchstart',function(e){
        var y = _mixerCoords(e);
		var coordStart = y;
		var lastCoord = y;
		
		if(!$(e.target).hasClass('.top') && $(e.target).parents('.pan').length)
		{
			$(this).on("mousemove touchmove",function(e){
                var yy = _mixerCoords(e);
				var coord = yy;
				if(coord > coordStart)
				{
					if(coord > lastCoord)
						$this.panLevel -= (coord - lastCoord) * 0.01;
					else
						$this.panLevel += (lastCoord - coord) * 0.01;
				} else {
					if(coord < lastCoord)
						$this.panLevel -= (coord - lastCoord) * 0.01;
					else
						$this.panLevel += (lastCoord - coord) * 0.01;
				}
				if($this.panLevel > 1)
					$this.panLevel = 1;
				
				// console.log(coordStart + ' / ' + e.pageY);
				// console.log($this.panLevel);
				lastCoord = yy;
				$this.setPan(mixer);
			 });
		}
	});
	
	$(document).on('mouseup touchend',function(e){
		$this.$channel.off("mousemove touchmove");
	});
	
	this.$volume.find('.slider').on("input change",function(){
		if(!$(this).parents('.channel').hasClass('loaded'))
			return false;
		$this.volumeLevel = parseFloat($(this).val());
		$this.setVolume($this.volumeLevel);
	});
	this.$mute.click(function(){
		if(!$(this).parents('.channel').hasClass('loaded'))
			return false;
		
		if($(this).hasClass('active'))
			$this.volumeLevel = $this.$volume.find('input').val()
		else
			$this.volumeLevel = 0;
			
		$this.setVolume($this.volumeLevel);
		$(this).toggleClass('active');
		$this.$volume.toggleClass('off');
		return false;
	});
	this.$solo.click(function(){
		if(!$(this).parents('.channel').hasClass('loaded'))
			return false;
		
		$(this).toggleClass('active');
		mixer.$interface.find('.channel .mute').removeClass('active');
		if($(this).hasClass('active'))
			mixer.$interface.find('.channel.loaded .solo').not(this).removeClass('active');
		
		for(var i = 0; i < mixer.channels.length; i++)
		{
			if($(this).hasClass('active') && i != ($this.number - 1))
			{
				mixer.channels[i].setVolume(0);
				mixer.channels[i].$mute.addClass('active');
			} else {
				mixer.channels[i].setVolume(mixer.channels[i].$volume.find('input').val());
			}
		}
		return false;
	});
	
	
}

Channel.prototype.init = function(mixer) {
	this.source = mixer.context.createBufferSource();
	this.pan = mixer.context.createPanner();
	this.pan.panningModel = 'equalpower';
	this.gain = mixer.context.createGain();
	this.volume = mixer.context.createGain();
	this.mute = mixer.context.createGain();
	this.gain.gain.value = mixer.masterGainLevel;
	this.volume.gain.value = this.volumeLevel;
	this.mute.gain.value = 0;
	this.analyser = mixer.context.createAnalyser();
	this.analyser.smoothingTimeConstant = 0.3;
	this.analyser.fftSize = 1024;
	var $this = this;

	this.jsNode = mixer.context.createScriptProcessor(2048, 1, 1);
	this.jsNode.onaudioprocess = function() {
		var num = $this.number - 1;
		var level = 0;
		var masterGainLeft = 0;
		var masterGainRight = 0;
		
		if(mixer.isPlaying)
		{
			var array = new Uint8Array($this.analyser.frequencyBinCount);
			$this.analyser.getByteFrequencyData(array);
			var panLeft = 1;
			var panRight = 1;
			var avg = average(array);
			level = (avg * ($this.volume.gain.value * 100)/100);
			
			if($this.panLevel < 0.0)
				panRight = (1 + $this.panLevel);
			else if($this.panLevel > 0.0)
				panLeft = (1 - $this.panLevel);
			
			mixer.channelLevels[0][num] = (level * panLeft);
			mixer.channelLevels[1][num] = (level * panRight);
			
			var highestLeft = Math.max.apply(Math,mixer.channelLevels[0]);
			var highestRight = Math.max.apply(Math,mixer.channelLevels[1]);
			masterGainLeft = Math.round((highestLeft) * mixer.masterGainLevel);
			masterGainRight = Math.round((highestRight) * mixer.masterGainLevel);

			if(highestLeft == mixer.channelLevels[0][num] && panLeft < 1)
				masterGainLeft = (masterGainLeft * panLeft);
			if(highestRight == mixer.channelLevels[1][num] && panRight < 1)
				masterGainRight = (masterGainRight * panRight);
			
		} else {
			mixer.channelLevels[0][num] = 0;
			mixer.channelLevels[1][num] = 0;
		}
		
		$this.$meter.find('.meter-left .meter-fill').css('height',mixer.channelLevels[0][num] + "%");
		$this.$meter.find('.meter-right .meter-fill').css('height',mixer.channelLevels[1][num] + "%");
		
		mixer.$interface.find('.master-controls .meter-left .meter-fill').css('height', masterGainLeft+"%");
		mixer.$interface.find('.master-controls .meter-right .meter-fill').css('height', masterGainRight+"%");
	}
	
	function average(nums) {
		var total = 0;
		for(var i = 0; i < nums.length; i++)
			total += nums[i];
		return (total / nums.length);
	}
	
	this.source.connect(this.volume);
	this.volume.connect(this.gain);
	this.gain.connect(this.pan);
	this.pan.connect(mixer.context.destination);
	this.jsNode.connect(mixer.context.destination);
	this.analyser.connect(this.jsNode);
}
Channel.prototype.setPan = function(mixer) {
	var deg = Math.round((this.panLevel + .5) * 100);
    if(deg > 47 && deg < 53)
        deg = 50;
	else if(deg > 100)
		deg = 100;
	var position = (deg * 63);
	this.$pan.css('background-position-y', '-'+position + 'px');
	if(mixer.isLoaded && this.isLoaded)
		this.pan.setPosition(this.panLevel, 0, 1 - Math.abs(this.panLevel));
};
Channel.prototype.setVolume = function(level) {
	if(this.isLoaded)
		this.volume.gain.value = level;
}
Channel.prototype.fade = function(level) {
	var $this = this;
    
    
	var interval = function() {
        var cur = (Math.round(parseFloat($this.$volume.find('.slider').val()) * 100) / 100);
		if(cur < level)
			$this.$volume.find('.slider').val(cur + 0.01).change();
		else if(cur > level)
			$this.$volume.find('.slider').val(cur - 0.01).change();
		else
			clearInterval(motion);
	}
	var motion = setInterval(interval, 1);
    
}
Channel.prototype.destroy = function() {
	if(!this.isLoaded)
		return false;
	
	this.isLoaded = false;
	this.volumeLevel = .84;
	this.panLevel = 0;
	this.jsNode.onaudioprocess = null;
	// this.jsNode = null;
	this.audioBuffer = null;
	this.gain.disconnect();
	this.volume.disconnect();
	this.mute.disconnect();
	this.source.disconnect();
	// this.analyser = null;
};
Channel.prototype.play = function(mixer,time) {
	if(!this.isLoaded)
		return false;
	else if(!time)
		time = 0;
	this.source = mixer.context.createBufferSource();
	console.log('playing: ' + this.number);
	
	this.source.buffer = this.audioBuffer;
	// this.source.loop = true;
	this.source.connect(this.analyser);
	this.source.connect(this.volume);
	this.source.start(0,time);
};
Channel.prototype.stop = function() {
	if(this.isLoaded)
		this.source.stop(0);
};

Channel.prototype.load = function(mixer,$elem,autoPlay) {
	console.log('channel '+this.number+' loading');
	this.url = $elem.attr('data-url');
	
	mixer.$interface.find('.channel:eq('+(this.number-1)+') .track-title').text($elem.attr('data-title'));
	var $this = this;
	var request = new XMLHttpRequest();
    
	request.responseType = 'blob';
	request.open('GET', $this.url, true);
    
    request.onload = function() {
        var reader = new FileReader();
		reader.readAsArrayBuffer(request.response);
		reader.onload =  function(e){
			
            mixer.context.decodeAudioData(this.result, function(buffer) {
                $this.audioBuffer = buffer;
                $this.isLoaded = true;
                mixer.$interface.find('.channel:eq('+($this.number-1)+')').addClass('loaded');
                $this.loaded(mixer,autoPlay);
            });
            
		};
        
        /*
		*/
	};
	request.send();
};

Channel.prototype.loaded = function(mixer,autoPlay) {
	if(mixer.channelsActive <= mixer.$interface.find('.channel.loaded').length)
	{
		console.log('loaded!');
		mixer.isLoaded = true;
		mixer.duration = mixer.channels[0].audioBuffer.duration;
		mixer.$interface.find('.channel.loaded .volume').removeClass('off');
		mixer.$interface.find('.media .duration-total').text(mixer.formatTime(mixer.duration));
		mixer.$interface.find('.meter .meter-fill').show();
		mixer.$interface.addClass('loaded');
		mixer.$interface.removeClass('loading');
		if(autoPlay)
			mixer.play();
	}
};

function _mixerCoords(e)
{
    var y = 0;
    if(e.type == 'touchstart' || e.type == 'touchmove' || e.type == 'touchend' || e.type == 'touchcancel'){
        var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
        y = touch.pageY;
    } else if (e.type == 'mousedown' || e.type == 'mouseup' || e.type == 'mousemove' || e.type == 'mouseover'|| e.type=='mouseout' || e.type=='mouseenter' || e.type=='mouseleave') {
        y = e.clientY;
    }
    return y;
}







var mixer = new Mixer();
mixer.interface = $('.mixer');
mixer.playlist = $('.mixer-demo');
mixer.selectors = $('.mixer-selector');
mixer.init();

