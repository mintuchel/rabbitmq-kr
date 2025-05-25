import amqp from 'amqplib';

const exchange = 'topic_logs';
const bindingKey = '*.*.rabbit';

async function recieveMessage() {

    console.log("current queue's routing key is %s", bindingKey);

    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        // 사용할 Exchange 선언
        await channel.assertExchange(exchange, 'topic', { durable: false });

        // 메시지를 전달받을 익명 Queue 선언
        const anonymous_queue = await channel.assertQueue('', { exclusive: true });

        // Exchange로부터 Queue를 통해 현재 bindingKey에 매칭되는 routingkey를 가진 메시지 받기
        await channel.bindQueue(anonymous_queue.queue, exchange, bindingKey);

        console.log("[*] Waiting for messages. To exit press CTRL+C");

        channel.consume(anonymous_queue.queue, function (msg) {
            if (msg.content) {
                console.log("[x] Received Type: ", msg.fields.routingKey);
           } 
        }, {
            noAck: true
        });
    } catch (error) {
        console.error('Error recieving message:', error);
    }
}

recieveMessage();