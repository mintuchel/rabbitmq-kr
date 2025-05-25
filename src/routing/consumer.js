import amqp from 'amqplib';

const exchange = 'direct_logs';
const routingKey = 'error';

async function recieveMessage() {

    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        // 사용할 Exchange 설정
        // exchange_type은 direct 타입
        await channel.assertExchange(exchange, 'direct', { durable: false });

        // 메시지 받을 익명큐 선언
        const anonymous_queue = await channel.assertQueue('', { exclusive: true });

        // Exchange로부터 Queue를 통해 현재 bindingKey에 매칭되는 routingkey를 가진 메시지 받기
        await channel.bindQueue(anonymous_queue.queue, exchange, routingKey);

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