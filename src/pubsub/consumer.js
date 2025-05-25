import amqp from 'amqplib';

const exchange = 'logs';

async function recieveMessage() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        // 사용할 Exchange 선언
        await channel.assertExchange(exchange, 'fanout', { durable: false });

        // 메시지 받을 익명큐 선언
        const anonymous_queue = await channel.assertQueue('', { exclusive: true });

        // Exchange로부터 직전 익명큐를 통해 메시지 받기
        // 연결된 Exchange가 fanout 타입이라 bindingKey를 명시할 필요가 없음
        await channel.bindQueue(anonymous_queue.queue, exchange, '');

        console.log("[*] Waiting for messages. To exit press CTRL+C");

        // 메시지 수신 시 콜백함수 실행
        channel.consume(anonymous_queue.queue, function (msg) {
            if (msg.content) {
                console.log("[x] Received:", msg.content.toString());
            }
            channel.ack(msg);
        }, {
            noAck: false
        });
    } catch (error) {
        console.error('Error consuming task:', error);
    }
}

recieveMessage();