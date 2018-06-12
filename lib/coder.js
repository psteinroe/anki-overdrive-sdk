/**
 * @file
 * 
 * Decodes and encodes messages
 */

function decodeCarname(manufacturerData) {
    /**
     * Get car name by hex char at position 7 in the manufacturer data string
    */
    const substr = parseInt(manufacturerData.toString('hex').charAt(7), 16)
    let carname = null
    switch (substr) {
        case 0:
            carname = 'x52'
            break
        case 8:
            carname = 'groundshock'
            break
        case 9:
            carname = 'skull'
            break
        case 10:
            carname = 'thermo'
            break
        case 11:
            carname = 'nuke'
            break
        case 12:
            carname = 'guardian'
            break
        case 13:
            //
            break
        case 14:
            carname = 'bigbang'
            break
        case 15:
            carname = 'Free Wheel'
            break
        case 16:
            carname = 'x52'
            break
        case 17:
            carname = 'x52 ice'
            break
        default:
            return new Error('Carname unknown.')
    }
    return carname
}

function getMessageTypes() {
    return {
        event: [23, 41, 43, 54, 67, 77, 134, 201],
        status: [25, 27, 39, 45, 63, 65]
    }
}

function decodeMessage(data, isNotification) {
    const messageId = data.readUInt8(1)
    let dict = {
        'messageId': messageId,
        'data': data,
        'isNotification': isNotification,
        'timestamp': Date.now()
    }
    if (messageId == '23') {
        // 'Ping Response'
        // example: <Buffer 01 17>
        dict['descr'] = 'Ping Response'
    }
    else if (messageId == '25') {
        // 'Version'
        // example: <Buffer 05 19 6e 26 00 00>
        dict['descr'] = 'Version'
        dict['version'] = data.readUInt16LE(2)
    }
    else if (messageId == '27') {
        // 'Battery Level'
        // example: <Buffer 03 1b 50 0f>
        dict['descr'] = 'Battery Level'
        const MAX_BATTERY_LEVEL = 4200
        const level = data.readUInt16LE(2)
        dict['batteryLevel'] = Math.floor((level / MAX_BATTERY_LEVEL) * 100)
    }
    else if (messageId == '39') {
        // 'Localization Position Update'
        // example: <Buffer 10 27 21 28 48 e1 86 c2 02 01 47 00 00 00 02 fa 00>
        dict['descr'] = 'Localization Position Update'
        dict['trackId'] = data.readUInt8(3)
        dict['trackPos'] = data.readUInt8(2)
        dict['offset'] = data.readFloatLE(4)
        dict['speed'] = data.readUInt16LE(8)
    }
    else if (messageId == '41') {
        // 'Localization Transition Update: Car reached new track'
        // example: <Buffer 12 29 00 00 02 2b 55 c2 00 ff 81 46 00 00 00 00 00 25 32>
        dict['descr'] = 'Localization Position Update: Car reached new track'
    }
    else if (messageId == '43') {
        // 'Vehicle Delocalized'
        // example: <Buffer 01 2b>
        dict['descr'] = 'Vehicle Delocalized'
    }
    else if (messageId == '45') {
        // 'Offset from Road Center Update'
        // example: <Buffer 06 2d 00 c8 75 3d 03>
        dict['descr'] = 'Offset from Road Center Update'
        dict['offsetFromRoadCenter'] = data.readFloatLE(2)
    }
    else if (messageId == '54') {
        // example: <Buffer 03 36 00 00>
        dict['descr'] = 'Unknown'
    }
    else if (messageId == '63') {
        // 'Loading Status Changed'
        // example: <Buffer 05 3f 01 00 00 01>
        dict['descr'] = 'Loading Status'
        const carNotLoading = data.readUInt8(3)
        if (carNotLoading == 0) {
            isLoading = false
        }
        else if (carNotLoading == 1) {
            isLoading = true
        }
        dict['isLoading'] = isLoading
    }
    else if (messageId == '65') {
        // 'Changed Offset (not documented)'
        // example: <Buffer 0e 41 9a 99 7f 42 9a 99 7f 42 00 00 00 02 81>
        dict['descr'] = 'Offset Changed (not documented)'
        dict['offset'] = data.readFloatLE(2)
    }
    else if (messageId == '67') {
        // 'Unknown'
        // example: <Buffer 01 43>
        dict['descr'] = 'Unknown'
    }
    else if (messageId == '77') {
        // 'Unknown'
        // example: <Buffer 03 4d 00 01>
        dict['descr'] = 'Unknown'
    }
    else if (messageId == '134') {
        // 'Unknown'
        // example: <Buffer 0b 86 8e 00 27 08 00 00 10 10 00 00>
        dict['descr'] = 'Unknown'
    }
    else if (messageId == '201') {
        // 'Unknown'
        // example: tbd
        dict['descr'] = 'Unknown'
    }
    else {
        // 'Unknown message id'
        dict['descr'] = 'Unknown'
    }
    return dict
}

function encodeSpeed(speed, accel) {
    const message = new Buffer(7)
    message.writeUInt8(6, 0)
    message.writeUInt8(36, 1)
    message.writeInt16LE(speed, 2)
    message.writeInt16LE(accel, 4)
    return message
}

function encodeStop() {
    const message = new Buffer(7)
    message.writeUInt8(6, 0)
    message.writeUInt8(36, 1)
    message.writeInt16LE(0, 2)
    message.writeInt16LE(12500, 4)
    return message
}

function encodeOffsetSet(offset) {
    // LANE 1 -68
    // LANE 2 -23
    // LANE 3  23
    // LANE 4  68
    // const validOffsets = [-68, -23, 23, 68]
    // const offset = validOffsets[lane]
    const message = new Buffer(6)
    message.writeUInt8(5, 0)
    message.writeUInt8(44, 1)
    message.writeFloatLE(offset, 2)
    return message
}

function encodeOffsetChange(offset) {
    const message = new Buffer(12)
    message.writeUInt8(11, 0)
    message.writeUInt8(0x25, 1)
    message.writeInt16LE(250, 2)
    message.writeInt16LE(1000, 4)
    message.writeFloatLE(offset, 6)
    return message
}

function encodeLightChange(val) {
    const message = new Buffer(3)
    message.writeUInt8(2, 0)
    message.writeUInt8(29, 1)
    message.writeUInt8(val, 2)
    return message
}

function encodeEngineLightChange(r, g, b) {
    const message = new Buffer(18)
    message.writeUInt8(17, 0)
    message.writeUInt8(51, 1)
    message.writeUInt8(3, 2)
    message.writeUInt8(0, 3)
    message.writeUInt8(0, 4)
    message.writeUInt8(r, 5)
    message.writeUInt8(r, 6)
    message.writeUInt8(0, 7)
    message.writeUInt8(3, 8)
    message.writeUInt8(0, 9)
    message.writeUInt8(g, 10)
    message.writeUInt8(g, 11)
    message.writeUInt8(0, 12)
    message.writeUInt8(2, 13)
    message.writeUInt8(0, 14)
    message.writeUInt8(b, 15)
    message.writeUInt8(b, 16)
    message.writeUInt8(0, 17)
    return message
}

function encodeBatteryRequest() {
    const message = new Buffer(2)
    message.writeUInt8(1, 0)
    message.writeUInt8(26, 1)
    return message
}

function encodeDisconnect() {
    const message = new Buffer(2)
    message.writeUInt8(1, 0)
    message.writeUInt8(13, 1)
    return message
}

function encodeUTurn() {
    const message = new Buffer(2)
    message.writeUInt8(2, 0)
    message.writeUInt8(50, 1)
    return message
}

function encodeSDKActivation() {
    const message = new Buffer(4)
    message.writeUInt8(3, 0)
    message.writeUInt8(144, 1)
    message.writeUInt8(1, 2)
    message.writeUInt8(1, 3)
    return message
}

function encodePing() {
    message = new Buffer(2)
    message.writeUInt8(0x01, 0)
    message.writeUInt8(0x16, 1)
}

module.exports = {
    decodeCarname: decodeCarname,
    getMessageTypes: getMessageTypes,
    decodeMessage: decodeMessage,
    encodeSpeed: encodeSpeed,
    encodeStop: encodeStop,
    encodeOffsetSet: encodeOffsetSet,
    encodeOffsetChange: encodeOffsetChange,
    encodeLightChange: encodeLightChange,
    encodeEngineLightChange: encodeEngineLightChange,
    encodeBatteryRequest: encodeBatteryRequest,
    encodeDisconnect: encodeDisconnect,
    encodeUTurn: encodeUTurn,
    encodeSDKActivation: encodeSDKActivation,
    encodePing: encodePing
}