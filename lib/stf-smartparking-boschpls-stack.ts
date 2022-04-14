import { Aws, Duration, Stack, StackProps } from 'aws-cdk-lib'
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { CfnTopicRule } from 'aws-cdk-lib/aws-iot'
import { CfnDestination } from 'aws-cdk-lib/aws-iotwireless'
import { Runtime, Function, Code, CfnPermission } from 'aws-cdk-lib/aws-lambda'
import { Queue } from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'

export interface StfSmartparkingBoschplsStackProps extends StackProps{
  stf_iot_sqs_arn: string, 
  thing_prefix: string
}

export class StfSmartparkingBoschplsStack extends Stack {
  constructor(scope: Construct, id: string, props: StfSmartparkingBoschplsStackProps) {
    super(scope, id, props)
    const iot_rule_name = `StfSmartParkingBoschPLS`
    const stf_iot_sqs = Queue.fromQueueArn(this, 'StfIotSqs', props.stf_iot_sqs_arn)

    // Lambda that decode Bosch PLS payload and create ParkingSpot entity
    const lambda_boschpls_path  = `${__dirname}/lambda/boschpls`
    const lambda_boschpls = new Function( this, 'LambdaBoschPls', {
        runtime: Runtime.NODEJS_14_X,
        code: Code.fromAsset(lambda_boschpls_path),
        handler: 'index.handler',
        timeout: Duration.seconds(10),
        environment: {
            STF_IOT_SQS_URL : stf_iot_sqs.queueUrl,
            THING_PREFIX: props.thing_prefix
        }
    })

    // Permission to publish to the queue
    lambda_boschpls.addToRolePolicy(new PolicyStatement({
      actions: ["sqs:SendMessage"],
      resources: [`${stf_iot_sqs.queueArn}`]
    })) 


    // IoT Rule that receives data from LoRa destination 
    const iot_rule = new CfnTopicRule(this, 'IngestionIotRule', {
      ruleName: iot_rule_name, 
      topicRulePayload: {
          awsIotSqlVersion: '2016-03-23',
          ruleDisabled: false,
          sql: `SELECT * FROM 'iot'`,
          actions: [ 
              {
                  lambda: {
                      functionArn: lambda_boschpls.functionArn
                  }
              }
          ]
      }
    })

    // Grant IoT rule permission to invoke Lambda 
    new CfnPermission(this, 'LambdaPermissionIotRule', {
      principal: `iot.amazonaws.com`,
      action: 'lambda:InvokeFunction',
      functionName: lambda_boschpls.functionName,
      sourceArn: `${iot_rule.attrArn}`
    })

    // Destination Role to trigger iot rule 
    const role_lora_destination= new Role(this, 'RoleLoRaDestination', {
        assumedBy: new ServicePrincipal('iotwireless.amazonaws.com')
    })

    role_lora_destination.addToPolicy(new PolicyStatement({
      resources: ["*"],
      actions: ["iot:DescribeEndpoint"]
    }))
    role_lora_destination.addToPolicy(new PolicyStatement({
        resources: [`arn:aws:iot:${Aws.REGION}:${Aws.ACCOUNT_ID}:topic/$aws/rules/${iot_rule.ruleName}`],
        actions: ["iot:Publish"]
    }))

    // Lora destination 
    const lora_destination = new CfnDestination(this, 'LoraDestinationHandSanitizer', {
      expression: iot_rule_name,
      expressionType: 'RuleName',
      name: `${iot_rule_name}Destination`,
      roleArn: role_lora_destination.roleArn
    })


  }
}
