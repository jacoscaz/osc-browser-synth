OSC Browser Synth
=================

An experiment in controlling a browser-based synth powered by the Web Audio API using Lemur, OSC and Node.js.

More info
---------

- [Blog post](http://www.jacoscaz.com/there-s-a-lemur-playing-with-my-browser)
- [Youtube video](https://www.youtube.com/watch?v=e2CMFGEon0U)

Usage
-----

```
// 1) Open Lemur and set up the following controls
// knob   - 'freq'
// knob   - 'vol'
// switch - 'power'

// 2) Clone the repo
$ git clone jacoscaz/osc-browser-synth
$ cd osc-browser-synth
$ npm install

// 3) Edit the config file
$ nano config.json

// 4) Start all the servers
$ node index.js

// 5) Point Lemur towards the right address/port

// 6) Load up the site in your favorite browser

// 7) ENJOY!
```
