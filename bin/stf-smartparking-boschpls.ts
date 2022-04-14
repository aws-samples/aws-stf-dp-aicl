#!/usr/bin/env node
import 'source-map-support/register'
import { App, Aws } from 'aws-cdk-lib'
import { StfSmartparkingBoschplsStack } from '../lib/stf-smartparking-boschpls-stack'
import { Parameters } from '../parameters'

const app = new App();
new StfSmartparkingBoschplsStack(app, 'StfSmartparkingBoschplsStack', {
  thing_prefix: Parameters.thing_prefix,
  // ARN of the STF IoT Queue. If you have not changed the name of the queue in the STF IoT Stack, 
  // you don't need to change anything. 
  stf_iot_sqs_arn: `arn:aws:sqs:${Aws.REGION}:${Aws.ACCOUNT_ID}:StfIoTQueue-${Aws.REGION}`
})