# anki-overdrive-node-sdk
Anki Overdrive Node.js SDK

**DISCLAIMER: THIS PACKAGE IS A WIP**

## Install
The package is available on npm.
```bash
npm install anki-overdrive-sdk --save
```

## Usage and Getting Started
Calling `setUp()` will scan for cars, connect to them and initialize everything for you.
```javascript
const anki = require('anki-overdrive-sdk')

anki.setUp()
.then(() => {
    // The connection is established and you can start to send commands now
})
.catch((err) => {
    throw new Error(err)
})
```
Always disconnect from the cars when exiting, otherwise noble can cause problems.
```javascript
function exitHandler(options, err) {
    anki.disconnectAll()
    process.exit()
}

process.on('exit', exitHandler.bind(null, {cleanup: true}))
process.on('SIGINT', exitHandler.bind(null, {exit: true}))
process.on('uncaughtException', exitHandler.bind(null, {exit: true}))
```

## Events
You can listen to four events by subscribing to them on the `eventemitter` object.
+ `carStatusMessage`
+ `carEventMessage`
+ `carReady`
+ `deviceDisconnected`

```javascript
const eventemitter = anki.eventemitter
eventemitter.on('carStatusMessage', (device, status) => {
    // New car status
})

eventemitter.on('carEventMessage', (device, msg) => {
    // New car event message
})

eventemitter.on('carReady', (device) => {
    // New device
}) 

eventemitter.on('deviceDisconnected', (device) => {
    // A device disconnected
}) 
```
Device Object:
```javascript
{
    id: '<deviceId>',
    name: '<deviceName>'
}
```
Car Status:
```javascript
{
    lastMessage: '<timeStamp>',
    version: '<version>',
    batteryLevel: '<batteryLevel>',
    trackId: '<trackId>',
    bufferedTrackId: '<lastTrackId>',
    trackPos: '<trackPos>',
    bufferedTrackPos: '<lastTrackPos>',
    offset: '<offset>',
    offsetNotDocumented: '<offsetNotDocumented>',
    offsetFromRoadCenter: '<offsetFromRoadCenter>',
    speed: '<speed>',
    isLoading: '<isLoading>'
}
```
A message for an event always includes a description beside optional additional event-specific data. For now, check `lib/coder.js` for more information.

## Commands
The following commands are implemented so far. If the `deviceId` is not specified or unknown, the command will be sent to every currenty connected car.

**IMPORTANT NOTE:** Some of the commands are not fully tested yet!
```javascript
anki.setOffset(deviceId, offset)
anki.changeLane(deviceId, goRight)
anki.setSpeed(deviceId, speed, accel)
anki.setLight(deviceId, val)
anki.setEngineLight(deviceId, r, g, b)
anki.uTurn(deviceId)
anki.getBatteryLevel(deviceId)
anki.ping(deviceId)
```