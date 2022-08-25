#!/usr/bin/env node
import 'source-map-support/register'
import { App, Aws } from 'aws-cdk-lib'
import { StfDpAiclStack } from '../lib/stf-dp-aicl-stack'

const app = new App()

  // ARN OF THE STF IOT QUEUE. IF YOU KEPT THE DEFAULT NAME, YOU DON'T NEED TO CHANGE IT 
const stf_iot_sqs_arn = `arn:aws:sqs:${Aws.REGION}:${Aws.ACCOUNT_ID}:StfIoTQueue-${Aws.REGION}`


/**
 *  LIST OF STACKS, UNCOMMENT THE ONE YOU DON'T WANT TO DEPLOY
*/


// STACK FOR THE LORAWAN BOSCH PARKING LOT SENSOR 
const stf_smartparking_boshpls_stack = new StfDpAiclStack(app, 'StfSmartparkingBoschplsStack', { 
  thing_prefix: 'SmartParking-BoschPLS', 
  stf_iot_sqs_arn
})


// STACK FOR THE SENSECAP S2103 INDOOR AND OUTDOOR ENVIRONMENT SENSOR 
const stf_indoorenv_sensecaps2103_stack = new StfDpAiclStack(app, 'StfIndoorEnvSensecaps2103Stack', { 
  thing_prefix: 'IndoorEnvironment-SENSECAPS2103', 
  stf_iot_sqs_arn
})


// STACK FOR THE MILESIGHT AM103 INDOOR ENVIRONMENT SENSOR 
const stf_indoorenv_am103_stack = new StfDpAiclStack(app, 'StfIndoorEnvAm103Stack', { 
  thing_prefix: 'IndoorEnvironment-AM103', 
  stf_iot_sqs_arn
})

// STACK FOR THE ELSYS ERS SOUND INDOOR ENVIRONMENT SENSOR 
const stf_indoorenv_erssound_stack = new StfDpAiclStack(app, 'StfIndoorEnvErsSoundStack', { 
  thing_prefix: 'IndoorEnvironment-ErsSound', 
  stf_iot_sqs_arn
})


