const STF_IOT_SQS_URL = process.env.STF_IOT_SQS_URL
const THING_PREFIX = process.env.THING_PREFIX
const aws = require('aws-sdk')
const sqs = new aws.SQS({})

exports.handler = async (event) => {
    try { 
        const { PayloadData, WirelessMetadata: { LoRaWAN : {FPort, DevEui, Timestamp} }} = event
        let bf = Buffer.from(PayloadData, 'base64')
        console.log(`From ${DevEui} on FPort ${FPort}: ${bf.toString('hex')}`)

        let IndoorEnvironmentObserved= {
            id: `urn:ngsi-ld:IndoorEnvironmentObserved:${THING_PREFIX}-${DevEui}`,
            type: `IndoorEnvironmentObserved`
        }

        IndoorEnvironmentObserved.refDevice = {
            type: "Relationship",
            object: `urn:ngsi-ld:Device:${THING_PREFIX}-${DevEui}`
        }

        IndoorEnvironmentObserved.dateObserved = {
            type: "Property",
            value: Timestamp
        }

        for (let i=0; i < bf.length;){
                let type = bf[i]
                // TEMPERATURE
                if(type == 0x01){
                    IndoorEnvironmentObserved.temperature = {
                        type: "Property",
                        value: (bf.slice(1)).readInt16BE(0)/10,
                        unitCode: "CEL"  
                    }
                bf = bf.slice(3)
                } 
                // HUMIDITY
                else if(type == 0x02){
                    IndoorEnvironmentObserved.relativeHumidity = {
                        type: "Property",
                        value: (bf.slice(1)).readUInt8(0),
                        unitCode: "P1"
                    }
                bf = bf.slice(2)
                } 
                // LIGHT
                else if(type == 0x04){
                    IndoorEnvironmentObserved.illuminance = {
                        type: "Property",
                        value: (bf.slice(1)).readInt16BE(0),
                        unitCode: "LUX"
                    }
                    bf = bf.slice(3)
                } 
                // PIR
                else if(type == 0x05){
                    // IndoorEnvironmentObserved.peopleCount = {
                    //     type: "Property",
                    //     value: (bf.slice(1)).readUInt8(0)
                    // }
                    bf = bf.slice(2)
                }
                // Internal Battery Voltage
                else if(type == 0x07){
                    const voltage = (bf.slice(1)).readInt16BE(0) / 1000
                    console.log({voltage})
                    bf = bf.slice(3)
                } 
                // SOUND
                else if(type == 0x15){
                    IndoorEnvironmentObserved.LAmax = {
                        type: "Property",
                        value: (bf.slice(1)).readUInt8(0),
                        unitCode: "dB"
                    }
                    IndoorEnvironmentObserved.LAeq = {
                        type: "Property",
                        value: (bf.slice(2)).readUInt8(0),
                        unitCode: "dB"
                    }
                    bf = bf.slice(3)
                } 
                else {
                    i++
                }
            }
                
            let send = await sqs.sendMessage({
                QueueUrl: STF_IOT_SQS_URL, 
                MessageBody: JSON.stringify(IndoorEnvironmentObserved)
            }).promise()


    } catch(e){
        console.log(e)
    }
}