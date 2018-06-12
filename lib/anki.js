const Scanner = require('./scanner')
const Device = require('./device')
const mediator = require('./mediator')

/**
 * This module exploits the SDK functions that are meant to be used
 * 
 * Current limitations:
 *  - Does not work with the track at all (no scan etc.) 
 *  - Does not handle disconnect
 */
module.exports = {
    devices: devices = [],
    eventemitter: mediator.public,

    /**
     * 
     * Set ups SDK by scanning for devices and connecting to them
     * 
     */
    async setUp() {
        try {
            const devices = await this.scanDevices()
            this.devices = devices
            await this.connectAll()
            mediator.private.on('deviceDisconnected', (device) => {
                this._removeDevice(device.id)
            })
        } catch (err) {
            throw new Error(err)
        } 
    },

    _removeDevice (deviceId) {
        const index = this.devices.findIndex(device => { return device.id === deviceId })
        if ( index >= 0 )
            this.devices.splice(index, 1)
    },
    
    /**
     * 
     * Scans for peripherals and creates a device object for each
     * 
     * @returns {object[]} devices
     * 
     */
    async scanDevices() {
        try {
            const that = this
            const scanner = new Scanner()
            scanner.setUpNoble()
            
            const peripherals = await scanner.scan()  
            const devices = peripherals.map((peripheral) => {
                return new Device(peripheral)
            })
        
            return devices
        } catch (err) {
            throw new Error(err)
        }

    },

    /**
     * 
     * Connects to all available devices
     * 
     */    
    connectAll() {
        this.devices.forEach((device) => {
            device.connect()
        })
    },
    
    /**
     * 
     * Disconnects from all available devices
     * 
     */
    disconnectAll() {
        this.devices.forEach((device) => {
            device.disconnect()
        })
    },
    
    /**
     * 
     * Sets offset for device
     * 
     * @param {string} deviceId 
     * @param {number} offset 
     */
    setOffset(deviceId, offset) {
        if (offset > 67) {
            offset = 67
        } else if (offset < -67) {
            offset = -67
        }
    
        if (deviceId == null) {
            this.devices.forEach((device) => {
                device.setOffset(offset)
            })
        } else {
            this.devices.find(device => { 
                return device.id === deviceId 
            }).setOffset(offset)
        }
    },
    
    /**
     * 
     * Changes lane for device
     * 
     * @param {string} deviceId
     * @param {boolean} goRight
     */
    changeLane(deviceId, goRight) {
        if (deviceId == null) {
            this.devices.forEach((device) => {
                device.changeLane(goRight)
            })
        } else {
            this.devices.find(device => { 
                return device.id === deviceId 
            }).changeLane(goRight)
        }
    },
    
    /**
     * 
     * Set speed for device
     * 
     * @param {string} deviceId 
     * @param {number} speed 
     * @param {number} accel 
     */
    setSpeed(deviceId, speed, accel) {
        if (speed < 0) speed = 0
        else if (speed > 1200) speed = 1200
        if (accel == null) accel = 1000
        
        if (deviceId == null) {
            this.devices.forEach((device) => {
                device.setSpeed(speed, accel)
            })
        } else {
            this.devices.find(device => {
                return device.id === deviceId
             }).setSpeed(speed, accel)
        }
    },
    
    /**
     * 
     * Set light for device
     * 
     * @param {string} deviceId 
     * @param {number} val 
     */
    setLight(deviceId, val) {
        const validVals = [0, 1, 2, 3]
    
        if (validVals.includes(val)) {
            if (deviceId == null) {
                this.devices.forEach((device) => {
                    device.setLight(val)
                })
            } else {
                this.devices.find(device => { 
                    device.id === deviceId
                }).setLight(val)
            }
        } else {
            console.error(val + ' is not a valid value')
        }
    },
    
    /**
     * 
     * Set engine light for device
     * 
     * @param {string} deviceId 
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     */
    setEngineLight(deviceId, r, g, b) {
        if (r < 0) r = 0
        if (r > 255) r = 255
        if (g < 0) g = 0
        if (g > 255) g = 255
        if (b < 0) b = 0
        if (b > 255) b = 255
    
        if (deviceId == null) {
            this.devices.forEach((device) => {
                device.setEngineLight(r, g, b)
            })
        } else {
            this.devices.find(device => { 
                return device.id === deviceId 
            }).setEngineLight(r, g, b)
        }
    },
    
    /**
     * 
     * Send command to do an U-Turn to device
     * 
     * @param {string} deviceId
     */
    uTurn(deviceId) {
        if (deviceId == null) {
            this.devices.forEach((device) => {
                device.uTurn()
            })
        } else {
            this.devices.find(device => {
                return device.id === deviceId
            }).uTurn()
        }
    },
    
    /**
     * 
     * Invoke a command that makes the car send its battery level
     * 
     * @param {string} deviceId 
     */
    getBatteryLevel(deviceId) {
        if (deviceId == null) {
            this.devices.forEach((device) => {
                device.getBatteryLevel()
            })
        } else {
            this.devices.find(device => {
                return device.id === deviceId
            }).getBatteryLevel()
        }
    },
    
    /**
     * 
     * Request ping from device
     * 
     * @param {string} deviceId 
     */
    ping(deviceId) {
        if (deviceId == null) {
            this.devices.forEach((device) => {
                device.ping()
            })
        } else {
            this.devices.find(device => {
                return device.id === deviceId
            }).ping()
        }
    }
}
