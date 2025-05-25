import amqp from 'amqplib';

const queue = 'rpc_queue';

function fibonacci(n) {
    if (n == 0 || n == 1) return 1;
    return fibonacci(n-1) + fibonacci(n-2);
}

async function startRpcServer() {
    
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    try {
        // 해당 queue 없으면 새로 생성
        // 이 큐로 request 받을거
        await channel.assertQueue(queue, { durable: false });
        channel.prefetch(1);

        console.log(' [x] Awaiting RPC requests');

        // rpc_queue 로 들어온 메시지 받기
        channel.consume(queue, async function (msg) {
            const n = parseInt(msg.content.toString());
            console.log(" [.] fib(%d)", n);

            const result = fibonacci(n);

            // replyTo queue로 메시지 전송
            channel.sendToQueue(
                msg.properties.replyTo,
                Buffer.from(result.toString()),
                {
                    correlationId: msg.properties.correlationId,
                }
            );

            channel.ack(msg);
        });
    } catch (error) {
        console.error('RPC Server error: error');
    }
}

startRpcServer();