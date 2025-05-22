import amqp from 'amqplib';

const exchangeName = 'topic_logs';

async function recieveMessage() {

    const severity = '*.orange.*';
    console.log("routing key is %s", severity);

    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        await channel.assertExchange(exchangeName, 'topic', { durable: false });

        const anonymous_queue = await channel.assertQueue('', { exclusive: true });

        // topic_logs 로부터 queue를 통해 severity에 해당하는 routing key를 가진 메시지만 받겠다
        await channel.bindQueue(anonymous_queue.queue, exchangeName, severity);

        console.log("[*] Waiting for messages. To exit press CTRL+C");

        channel.consume(anonymous_queue.queue, function (msg) {
            if (msg.content) {
                console.log("[x] Received:", msg.content.toString());
           } 
        }, {
            noAck: true
        });
    } catch (error) {
        console.error('Error recieving message:', error);
    }
}

recieveMessage();