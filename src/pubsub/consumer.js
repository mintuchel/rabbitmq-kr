import amqp from 'amqplib';

const exchange = 'logs';

async function recieveMessage() {
    try {
        // get channel from tcp connection between app and rabbitmq
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        // we will get messages from exchange named 'logs' whose type is 'fanout'
        await channel.assertExchange(exchange, 'fanout', { durable: false });

        // creating anonymous_queue which will get messages from exchange
        // and by exclusive option, the queue will be deleted when channel is down
        const anonymous_queue = await channel.assertQueue('', { exclusive: true });

        // binding queue and exchange
        await channel.bindQueue(anonymous_queue.queue, exchange, '');

        console.log("[*] Waiting for messages. To exit press CTRL+C");

        // when consumed, callback function is called
        channel.consume(anonymous_queue.queue, function (msg) {
            if (msg.content) {
                console.log("[x] Received:", msg.content.toString());
           } 
        }, {
            noAck: true
        });
    } catch (error) {
        console.error('Error consuming task:', error);
    }
}

recieveMessage();