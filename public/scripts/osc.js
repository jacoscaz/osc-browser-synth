
// Reads the config from the server

$.getJSON('/config.json', function(config) {





  //
  // VARS
  //





  var inputs;  // Array of $(<input data-address="">) 
  var oscPort; // OSC WS port instance
  




  //
  // WEBSOCKET & OSC
  //





  // Instantiates the OSC WS port

  oscPort = new osc.WebSocketPort({
    url: 'ws://127.0.0.1:' + config.wsPort
  });  

  // Quick'n'dirty error listener

  oscPort.on('error', console.log);

  // When a message is received, looks for an input with the
  // appropriate address and triggers the change and value events

  oscPort.on('message', function (oscMsg) {
    var input = inputs[oscMsg.address];
    if (!input) { return; }
    input.val(Math.round(oscMsg.args[0] * 10000))
      .trigger('change')
      .trigger('value');
  });

  // Opens the OSC WS port

  oscPort.on('open', function() {
    console.log('Connection opened');
  });





  //
  // INPUTS & CONTROLS
  //





  // Initializes the input object

  inputs = {};

  // For each 'knob' input, creates a UI control using the
  // jQuery.Knob library (trying to make it similar to Lemur's knobs)

  $('[data-type=knob]').each(function() {
    var $el = $(this);
    var address = $el.attr('data-address');
    var knob = $el.knob({
      min: 0, 
      max: 10000, 
      angleArc: 300, 
      angleOffset: -150, 
      displayInput: false,
      release: function(val) {

        // On release (mouseup), sends the new value 
        // via the OSC WS port and triggers the 'value'
        // event

        oscPort.send({
          address: address,
          args: val / 10000
        });
        $el.trigger('value');
      }
    });

    // Adds the input to the list

    inputs[address] = $el;
  });

  // For each 'switch' input, creates a UI control

  $('[data-type=switch]').each(function() {
    var $input   = $(this);
    var $control = $('<div class="switch"></div>');
    var address  = $input.attr('data-address');

    // Toggles the appropriate CSS class based on whether
    // the switch is to be considered "on" of "off"

    $input.on('change', function() {
      if ($input.val() > 0) {
        $control.addClass('active');
      } else {
        $control.removeClass('active');
      }
    });

    // On click, this sets the new value, sends it
    // via the OSC WS port and triggers the 'change' and 'value' events

    $control.click(function(ev) { 
      var newVal = $input.val() > 0 ? 0 : 10000; 
      $input.val(newVal).trigger('change').trigger('value');
      oscPort.send({
        address: address,
        args: newVal / 10000
      });
    });
    $input.parent().append($control);
    inputs[address] = $input;
  });





  //
  // AUDIO CONTEXT, OSCILLATOR, GAIN
  //





  // Sets up the audio context, an oscillator node and
  // a gain (volume) node.

  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var gainNode = window.gain = audioCtx.createGain();
  var osciNode = audioCtx.createOscillator();
  osciNode.type = 'sawtooth';
  gainNode.gain.value = 1;

  // gainNode is left unconnected so that
  // we can fake starting and stopping osciNode
  // by (un)connecting the former without having to 
  // re-create the latter.

  osciNode.connect(gainNode);
  osciNode.start();





  //
  // CONTROLS WIRING
  //





  var freqInput = inputs['/freq/x'];
  freqInput.on('value', function() {
    osciNode.frequency.value = freqInput.val();
  });

  var volInput = inputs['/vol/x'];
  volInput.on('value', function() {
    gainNode.gain.value = volInput.val() / 10000;
  });

  var powerInput = inputs['/power/x'];
  powerInput.on('value', function() {
    if (powerInput.val() > 0) {
      gainNode.connect(audioCtx.destination);
    } else {
      gainNode.disconnect(audioCtx.destination);
    }
  });





  //
  // 3... 2... 1... GO!
  //





  oscPort.open();

});

