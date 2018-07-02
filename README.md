# anki-overdrive-sdk
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
The cars emit a wide range of messages distinguished by their message id. In this SDK a distinction is drawn between messages of type *Status* and type *Event*:
```javascript
event: [23, 41, 43, 54, 67, 77, 134, 201],
status: [25, 27, 39, 45, 63, 65]
```
The messages of type *Status* update the status object below which then gets emitted by the SDK. The messages of type *Event* just get handed through and are emitted by the SDK individually. All unknown / undocumented messages are handled as messages of type *Event*. 

To summarize, the following four events are exposed by the eventemitter of the SDK:
+ `carStatusMessage`: Emits message of type *Status*
+ `carEventMessage`: Emits message of type *Event* and all unknown messages
+ `carReady`: A new car is connected and messages can be send
+ `deviceDisconnected`: A car got disconnected

Each event emits a device object, which describes the car by its id and its name (Groundshock / Skull etc.):
```javascript
{
    id: '<String>',
    name: '<String>'
}
```
### Status Messages
You can listen to all status messages by subscribing to the `carStatusMessage` event on the `eventemitter` object.
```javascript
const eventemitter = anki.eventemitter

eventemitter.on('carStatusMessage', (device, status) => {
    // New car status
})
```
The current status of a car is defined by the following object:
```javascript
{
    // Timestamp of the latest message from the car
    lastMessage: '<Timestamp>',
    // Version (?)
    version: '<String>',
    // Battery level of the car
    batteryLevel: '<Integer>',
    // Id of the track the car is currently on
    trackId: '<Integer>',
    // Last track Id 
    // Is used internally for calculating the current lane and
    // is just exposed out of generosity
    bufferedTrackId: '<Integer>',
    // Position of the car on the current track
    trackPos: '<Integer>',
    // Last track position
    // Is used internally for calculating the current lane and
    // is just exposed out of generosity
    bufferedTrackPos: '<Integer>',
    // Offset of the car
    offset: '<Integer>',
    // Some other offset but idk what it tells us
    offsetNotDocumented: '<Integer>',
    // Some other offset but idk what it tells us
    offsetFromRoadCenter: '<Integer>',
    // Speed of the car in mm/s
    speed: '<Integer>',
    // If true, the car currently gets loaded on the loading station
    isLoading: '<isLoading>'
}
```

### Event Messages
```javascript
const eventemitter = anki.eventemitter

eventemitter.on('carEventMessage', (device, msg) => {
    // New car event message
})
```

A message of type *Event* always includes the base object below, a description and optional additional event-specific data.
```javascript
{
    'messageId': '<Integer>',
    'data': '<ByteBuffer>',
    'isNotification': '<Boolean>',
    'timestamp': '<Timestamp>',
    'descr': '<String>',
}
```
#### Ping (ID: 23)
Just a ping response.

Example for buffer: `<Buffer 01 17>`

#### Version (ID: 41)
The car reached a new track

Example for buffer: `<Buffer 12 29 00 00 02 2b 55 c2 00 ff 81 46 00 00 00 00 00 25 32>`

#### Vehicle delocalized (ID: 43)
Vehicle delocalized (for example off the track)

Example for buffer: `<Buffer 01 2b>`

#### Unknown (ID: 54)
Not documented

Example for buffer: `<Buffer 03 36 00 00>`

#### Unknown (ID: 67)
Not documented

Example for buffer: `<Buffer 01 43>`

#### Unknown (ID: 77)
Not documented

Example for buffer: `<Buffer 03 4d 00 01>`

#### Unknown (ID: 134)
Not documented

Example for buffer: `<Buffer 0b 86 8e 00 27 08 00 00 10 10 00 00>`

#### Unknown (ID: 201)
Not documented

Example for buffer: `tbd`

### Connected Cars Update
The remaining events are simply emitting the device object:

```javascript
const eventemitter = anki.eventemitter

eventemitter.on('carReady', (device) => {
    // New device
}) 

eventemitter.on('deviceDisconnected', (device) => {
    // A device disconnected
}) 
```

## Commands
The following commands are implemented so far. If the `deviceId` is not specified or unknown, the command will be sent to every currently connected car.

**IMPORTANT NOTE:** Some of the commands are not fully tested yet!

+ `setOffset(deviceId?, offset)`: Sets offset for device(s)
+ `changeLane(deviceId?, goRight)`: Tells the car(s) to move onto the next lane on the right or left, determined by `goRight`
+ `setSpeed(deviceId?, speed, accel)`: Sets speed (mm/s) and acceleration (mm/s^2) of the car(s).
+ `setLight(deviceId?, val)`: Sets light of the car(s). `val` is an integer between 0 and 4:

   + 0: LIGHT_HEADLIGHTS    
   + 1: LIGHT_BRAKELIGHTS   
   + 2: LIGHT_FRONTLIGHTS   
   + 3: LIGHT_ENGINE        

+ `setEngineLight(deviceId?, r, g, b)`: Sets engine light of car(s) as RGB colors.
+ `uTurn(deviceId?)`: Tells car(s) to perform an U-Turn.
+ `getBatteryLevel(deviceId?)`: Tells car(s) to send out their battery level.
+ `ping(deviceId?)`: Ping car(s)