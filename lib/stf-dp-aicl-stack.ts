import { Aws, Duration, Stack, StackProps } from 'aws-cdk-lib'
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { CfnTopicRule } from 'aws-cdk-lib/aws-iot'
import { CfnDestination } from 'aws-cdk-lib/aws-iotwireless'
import { Runtime, Function, Code, CfnPermission } from 'aws-cdk-lib/aws-lambda'
import { Queue } from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'


export interface StfDpAiclStackProps extends StackProps {
  stf_iot_sqs_arn: string, 
  thing_prefix: string
}


export class StfDpAiclStack extends Stack {
  constructor(scope: Construct, id: string, props: StfDpAiclStackProps) {
    super(scope, id, props)

    const iot_rule_name = `${props.thing_prefix.replace(/[^a-zA-Z0-9]/g, '')}Rule`
    
    const stf_iot_sqs = Queue.fromQueueArn(this, 'StfIotSqs', props.stf_iot_sqs_arn)

    
    // LAMBDA THAT TRANSFORM PAYLOAD INTO NGSI-LD ENTITY 

    // PATH OF THE LAMBDA
    const lambda_modeling_path  = `${__dirname}/${props.thing_prefix.split('-').slice(-1)[0].toLowerCase()}`
    
    const lambda_modeling= new Function( this, 'ModelingLambda', {
        runtime: Runtime.NODEJS_14_X,
        code: Code.fromAsset(lambda_modeling_path),
        handler: 'index.handler',
        timeout: Duration.seconds(10),
        environment: {
            STF_IOT_SQS_URL : stf_iot_sqs.queueUrl,
            THING_PREFIX: props.thing_prefix
        }
    })

    // Permission to publish to the queue
    lambda_modeling.addToRolePolicy(new PolicyStatement({
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
                      functionArn: lambda_modeling.functionArn
                  }
              }
          ]
      }
    })

    // GRANT IoT RULE PERMISSION TO INVOKE LAMBDA
    new CfnPermission(this, 'LambdaPermissionIotRule', {
      principal: `iot.amazonaws.com`,
      action: 'lambda:InvokeFunction',
      functionName: lambda_modeling.functionName,
      sourceArn: `${iot_rule.attrArn}`
    })

    // DESTINATION ROLE TO TRIGGER IoT RULE
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

    // LORA DESTINATION
    const lora_destination = new CfnDestination(this, 'LoRaDestination', {
      expression: iot_rule_name,
      expressionType: 'RuleName',
      name: `${iot_rule_name}Destination`,
      roleArn: role_lora_destination.roleArn
    })


  }
}
