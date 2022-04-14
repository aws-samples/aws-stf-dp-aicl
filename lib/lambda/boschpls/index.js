const STF_IOT_SQS_URL = process.env.STF_IOT_SQS_URL
const THING_PREFIX = process.env.THING_PREFIX
const aws = require('aws-sdk')
const sqs = new aws.SQS({})

exports.handler = async (event) => {
    try {
        const { PayloadData, WirelessMetadata: { LoRaWAN : {FPort, DevEui, Timestamp} }} = event
        const bf = Buffer.from(PayloadData, 'base64')
        console.log(`From ${DevEui} on FPort ${FPort}: ${bf.toString('hex')}`)
        let entity = {}
        let thingName 
        entity.type = `ParkingSpot`
        entity.id = `urn:ngsi-ld:${entity.type}:${THING_PREFIX}-${DevEui}`
        entity.status = {
            type: "Property",
            observedAt: Timestamp,
            providedBy: {
                type: 'Relationship',
                object: `urn:ngsi-ld:Device:${THING_PREFIX}-${DevEui}`
            }
        }
        switch (FPort) {
            //Uplink message
            case 1:
                entity.status.value = bf.readUInt8(0) == 0 ? "free" : "occupied"
                break
            //Heartbeat message
            case 2:
                entity.status.value = bf.readUInt8(0) == 0 ? "free" : "occupied"
                break
            //Startup message message
            case 3:
                entity.status.value = bf.readUInt8(16) == 0 ? "free" : "occupied"
                break    
            default:
                break
        }

        let send = await sqs.sendMessage({
            QueueUrl: STF_IOT_SQS_URL, 
            MessageBody: JSON.stringify(entity)
        }).promise()

    } catch (e) {
        console.log(e)
    }
}
