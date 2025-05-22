import amqp from 'amqplib';

const exchange = 'direct_logs';
// routing key
const severity = 'error';

async function recieveMessage() {

    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        // we will get messages from exchange named 'direct_logs' whose type is 'direct'
        await channel.assertExchange(exchange, 'direct', { durable: false });

        // creating anonymous_queue which will get messages from exchange
        // and by exclusive option, the queue will be deleted when channel is down
        const anonymous_queue = await channel.assertQueue('', { exclusive: true });

        // binding queue and exchange
        // we will get messages from exchange where routing key is severity by queue
        await channel.bindQueue(anonymous_queue.queue, exchange, severity);

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