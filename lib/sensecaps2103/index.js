const STF_IOT_SQS_URL = process.env.STF_IOT_SQS_URL
const THING_PREFIX = process.env.THING_PREFIX
const aws = require('aws-sdk')
const sqs = new aws.SQS({})

exports.handler = async (event) => {
    try { 
        const { PayloadData, WirelessMetadata: { LoRaWAN : {FPort, DevEui, Timestamp} }} = event
        let bf = Buffer.from(PayloadData, 'base64')
        console.log(`From ${DevEui} on FPort ${FPort}: ${bf.toString('hex')}`)
        if(bf[0] != 0x01) throw new Error(`Not a measurement data packet from ${DevEui} on FPort ${FPort}: ${bf.toString('hex')}`)
        
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

        while(bf.length > 2){
            if(bf[0] != 0x01) continue
            switch (bf.readUInt16LE(1)) {
                // CO2
                case 4100:
                    IndoorEnvironmentObserved.co2 = {
                        type: "Property",
                        value: bf.readUInt32LE(3)/1000,
                        unitCode: "59"
                    }
                    bf = bf.slice(7)
                    break
    
                // TEMPERATURE
                case 4097:
                    IndoorEnvironmentObserved.temperature = {
                        type: "Property",
                        value: bf.readUInt32LE(3)/1000,
                        unitCode: "CEL"
                    }
                    bf = bf.slice(7)
                    break
    
                // RELATIVE HUMIDITY
                case 4098:
                    IndoorEnvironmentObserved.relativeHumidity = {
                        type: "Property",
                        value: bf.readUInt32LE(3)/1000,
                        unitCode: "P1"
                    }
                    bf = bf.slice(7)
                    break
                default:
                    bf = Buffer.alloc(0)
                    break
            }
       }
    
       
       if(!IndoorEnvironmentObserved.temperature) return
                
            let send = await sqs.sendMessage({
                QueueUrl: STF_IOT_SQS_URL, 
                MessageBody: JSON.stringify(IndoorEnvironmentObserved)
            }).promise()


    } catch(e){
        console.log(e.message)
    }
}