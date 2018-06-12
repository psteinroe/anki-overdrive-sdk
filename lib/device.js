const os = require('os')
const coder = require('./coder.js')
const mediator = require('./mediator')


/**
 * 
 * @class AnkiDevice
 * 
 * Class for creating Anki devices that handle the communications with a specific device.
 * 
 */
module.exports = class AnkiDevice {
    constructor (peripheral) {
        this.peripheral = peripheral
        this.id = peripheral.uuid
        this.serviceUuids = JSON.stringify(peripheral.advertisement.serviceUuids)
        this.name = coder.decodeCarname(peripheral.advertisement.manufacturerData)
        console.log('Created device ' + this.name)
        this.readCharacteristic = null
        this.writeCharacteristic = null

        this.data = {
            lastMessage: null,
            version: null,
            batteryLevel: null,
            trackId: null,
            bufferedTrackId: null,
            trackPos: null,
            bufferedTrackPos: null,
            offset: null,
            offsetNotDocumented: null,
            offsetFromRoadCenter: null,
            speed: null,
            isLoading: null
        }

    }

    connect() {
        try {
            const that = this
            console.log('Connecting with ' + this.id)
            const getService = function(services){
                if (os.platform() === 'win32' || os.platform() === 'linux') {
                    return services[2]
                } else {
                    return service[0] // macOS
                }
            }

            const setCharacteristics = function(characteristics) {
                for(let i in characteristics) {
                    const characteristic = characteristics[i]
                    if (characteristic.uuid == 'be15bee06186407e83810bd89c4d8df4') {
                        that.readCharacteristic = characteristic
                    }

                    if (characteristic.uuid == 'be15bee16186407e83810bd89c4d8df4') {
                        that.writeCharacteristic = characteristic
                    } 
                }                
            }

            const onConnect = async function() {
                const services = await that.peripheral.discoverServices([])
                const service = await getService(services)
                const characteristics = await service.discoverCharacteristics([])
                await setCharacteristics(characteristics)
                // Listen to own disconnect
                that.peripheral.once('disconnect', () => {
                    mediator.private.emit('deviceDisconnected', this)
                })
                mediator.private.emit('deviceConnected', that)
            }

            this.peripheral.once('connect', onConnect)
            this.peripheral.connect()
        } catch(err) {
            throw new Error(err)
        }
    }

    activateSDKMode() {
        console.log('Activating SDKMode for ' + this.id)
        const that = this
        if(!this.isConnected) {
            return new Error('Car is not connected yet.')
        }
        const message = coder.encodeSDKActivation()
        this._writeMessage(message)
        .then(() => {
            mediator.private.emit('SDKModeOn', that)
        })
    }

    turnOnLogging() {
        console.log('Turning logging on for ' + this.id)
        let that = this
        if(!that.isConnected) {
            return new Error('Car is not connected yet.')
        }

        that.readCharacteristic.notify(true)
        that.readCharacteristic.on('read', (data) => {
            that._onMessage(data)
        })
        mediator.private.emit('loggingOn', that)
    }

    _onMessage(data) {
        const message = coder.decodeMessage(data)
        const id = message.messageId
        const msgTypes = coder.getMessageTypes()

        if (msgTypes.status.includes(id)) {
            // Status Message: Update device data and send
            switch(id) {
                case 25:
                    this.data.version = message.version
                break
                case 27:
                    this.data.batteryLevel = message.batteryLevel
                break
                case 39:
                    this.data.bufferedTrackId = this.data.trackId
                    this.data.bufferedTrackPos = this.data.trackPos
                    this.data.trackId = message.trackId
                    this.data.trackPos = message.trackPos
                    this.data.offset = message.offset
                    this.data.speed = message.speed
                break
                case 45:
                    this.data.offsetFromRoadCenter = message.offsetFromRoadCenter
                break
                case 63:
                    this.data.isLoading = message.isLoading
                break
                case 65:
                    this.data.offsetNotDocumented = message.offset
                break
                default:
                    console.error('Unknown status message id')
            }
            this.data.lastMessage = + new Date()
            mediator.private.emit('carStatusMessage', this)
        } else {
            // Event Message: Stream
            mediator.private.emit('carEventMessage', this, message)
        }
    }

    disconnect() {
        // Let car disconnect itself
        const message = coder.encodeDisconnect()
        this._writeMessage(message)
        // Disconnect us from the car
        this.peripheral.disconnect(() => {
            this.readCharacteristic = null
            this.writeCharacteristic = null     
        })
    }

    setLane() {
        const offset = this._getCurrentLane()
        const message = coder.encodeOffsetSet(offset)
        this._writeMessage(message)
    }

    setSpeed(speed, accel) {        
        const message = coder.encodeSpeed(speed, accel)
        this._writeMessage(message)
    }

    setOffset(offset) {
        const message = coder.encodeOffsetChange(offset)
        this._writeMessage(message)
    }

    changeLane(goRight) {
        let message = null
        if(goRight) {
            message = coder.encodeOffsetChange(this.offset + 9)
        } else {
            message = coder.encodeOffsetChange(this.offset - 9)
        }
        this._writeMessage(message)
    }

    setLight(val) {
        // LIGHT_HEADLIGHTS    0
        // LIGHT_BRAKELIGHTS   1
        // LIGHT_FRONTLIGHTS   2
        // LIGHT_ENGINE        3
        const message = coder.encodeLightChange(val)
        this._writeMessage(message)
    }

    setEngineLight(r, g, b) {
        const message = coder.encodeEngineLightChange(r, g, b)
        this._writeMessage(message)
    }

    uTurn() {
        const message = coder.encodeUTurn()
        this._writeMessage(message)
    }

    getBatteryLevel() {
        const message = coder.encodeBatteryRequest()
        this._writeMessage(message)
    }

    ping() {
        const message = coder.encodePing()
        this._writeMessage(message)
    }

    isConnected(){
        return (this.readCharacteristic != null & this.writeCharacteristic != null)
    }

    invokeCommand(command) {
        try {
            let message = this.formatMessage(command)
            this.writeCharacteristic.write(message, false)
        } catch(err) {
            console.error(err)
        }
    }

    _getCurrentLane() {
        const trackId = this.buffer.trackId
        const trackPos = this.buffer.trackPos

        const bufferedTrackId = this.buffer.bufferedTrackId
        const bufferedTrackPos = this.buffer.bufferedTrackPos

        if(trackId != undefined && trackPos != undefined && bufferedTrackId != undefined && bufferedTrackPos != undefined){
            const direction = trackPos - bufferedTrackPos
    
            // Determine Current Lane
            if(trackPos == 0 || trackPos == 1 || trackPos == 2) {
                return -68.0 * direction
            }else if(trackPos == 15 || trackPos == 16 || trackPos == 17) {
                return -23.0 * direction
            }else if(trackPos == 30 || trackPos == 31 || trackPos == 32) {
                return 23.0 * direction
            } else if(trackPos == 45 || trackPos == 46 || trackPos == 47) {
                return 68.0 * direction
            } else {
                // Determine Offset between Lane 4 and 3
                if(trackPos == 3 || trackPos == 4 || trackPos == 5) {
                    return -59.0 * direction
                }
                else if(trackPos == 6 || trackPos == 7 || trackPos == 8) {
                    return -50.0 * direction
                }
                else if(trackPos == 9 || trackPos == 10 || trackPos == 11) {
                    return -41.0 * direction
                }
                else if(trackPos == 12 || trackPos == 13 || trackPos == 14) {
                    return -32.0 * direction
                }
    
                // Determine Offset between Lane 3 and 2
                else if(trackPos == 18 || trackPos == 19 || trackPos == 20) {
                    return -14.0 * direction
                }
                else if(trackPos == 21 || trackPos == 22 || trackPos == 23) {
                    return -5.0 * direction
                }
                else if(trackPos == 24 || trackPos == 25 || trackPos == 26) {
                    return 5.0 * direction
                }
                else if(trackPos == 27 || trackPos == 28 || trackPos == 29) {
                    return 14.0 * direction
                }
    
                // Determine offset between Lane 2 and 1
                else if(trackPos == 33 || trackPos == 34 || trackPos == 35) {
                    return 32.0 * direction
                }
                else if(trackPos == 36 || trackPos == 37 || trackPos == 38) {
                    return 41.0 * direction
                }
                else if(trackPos == 39 || trackPos == 40 || trackPos == 41) {
                    return 50.0 * direction
                }
                else if(trackPos == 42 || trackPos == 43 || trackPos == 44) {
                    return 59.0 * direction
                }
            }
        }
        return new Error('Buffer empty.')
    }

    _writeMessage(message) {
        return this.writeCharacteristic.write(message, false)
    }
}
