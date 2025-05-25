import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

const queue = 'rpc_queue';

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log("Usage: rpc_client.js <num>");
    process.exit(1);
}

const num = parseInt(args[0]);

async function sendRpcRequest(n) {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        const { queue } = await channel.assertQueue('', { exclusive: true });
        const correlationId = uuidv4();

        console.log(' [x] Requesting fib(%d)', n);

        // 1. 응답 메시지 받을때
        // 응답 받을 Queue + 메시지 받았을시 비동기적으로 실행될 callback function
        channel.consume(queue, function(msg) {
            if (msg.properties.correlationId === correlationId) {
                console.log(' [.] Got %s', msg.content.toString());
                setTimeout(function () {
                    connection.close();
                    process.exit(0);
                }, 500);
            }
        }, { noAck: true });

        // 2. 요청 메시지 전송
        channel.sendToQueue(queue, Buffer.from(n.toString()), {
            correlationId,
            replyTo: queue,
        });
    } catch (error) {
        console.error('RPC Client error:', error);
    }
}

sendRpcRequest(num);