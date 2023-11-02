const STF_IOT_SQS_URL = process.env.STF_IOT_SQS_URL
const THING_PREFIX = process.env.THING_PREFIX
const aws = require('aws-sdk')
const sqs = new aws.SQS({})

exports.handler = async (event) => {
    try {
        const { PayloadData, WirelessMetadata: { LoRaWAN : {FPort, DevEui, Timestamp} }} = event
        let bf = Buffer.from(PayloadData, 'base64')
        console.log(`From ${DevEui} on FPort ${FPort}: ${bf.toString('hex')}`)
        let entity_device = {}
        let entity_airquality = {}
        let thingName 
        entity_airquality.type = `IndoorEnvironmentObserved`
        entity_airquality.id = `urn:ngsi-ld:${entity_airquality.type}:${THING_PREFIX}-${DevEui}`
        entity_device.type = `Device`
        entity_device.id = `urn:ngsi-ld:${entity_device.type}:${THING_PREFIX}-${DevEui}`
        for (let i= 0; i < bf.length; ) {
            let ch_id = bf[i]
            let ch_type = bf[i+1]
            // BATTERY
            if( ch_id == 0x01 && ch_type == 0x75 ){
                entity_device.batteryLevel = {
                    type: "Property",
                    value: (bf.slice(2)).readUInt8(0),
                    unitCode: "P1"
                }
                bf = bf.slice(3)
            } 
            // TEMPERATURE
            else if (ch_id == 0x03 && ch_type == 0x67) {
                entity_airquality.temperature = {
                    type: "Property",
                    value: (bf.slice(2)).readInt16LE(0)/10,
                    unitCode: "CEL"
                }
                bf = bf.slice(4)
            }
            // HUMIDITY
            else if (ch_id == 0x04 && ch_type == 0x68) {
                entity_airquality.relativeHumidity = {
                    type: "Property",
                    value: (bf.slice(2)).readUInt8(0)/2,
                    unitCode: "P1"
                }
                bf = bf.slice(3)
            }
            // CO2
            else if (ch_id == 0x07 && ch_type == 0x7D) {
                entity_airquality.co2 = {
                    type: "Property",
                    value: (bf.slice(2)).readInt16LE(0),
                    unitCode: "59"
                }
                bf = bf.slice(4)
            }
            else{
                i++
            }
    
        }

        entity_airquality.dateObserved = {
            type: "Property",
            value: Timestamp
        }

        entity_airquality.refDevice = {
            type: "Relationship",
            object: `urn:ngsi-ld:${entity_device.type}:${THING_PREFIX}-${DevEui}`
        }

        let entries = []
        entries.push({
            Id: `${Math.floor(Math.random() * 1e10)}`,
            MessageBody: JSON.stringify(entity_airquality)
        })
        entries.push({
            Id: `${Math.floor(Math.random() * 1e10)}`,
            MessageBody: JSON.stringify(entity_device)
        })
        let send = await sqs.sendMessageBatch({
            QueueUrl: STF_IOT_SQS_URL, 
            Entries: entries
        }).promise()

    } catch (e) {
        console.log(e)
    }
}