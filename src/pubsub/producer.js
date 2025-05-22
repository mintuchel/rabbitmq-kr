import amqp from 'amqplib';

const exchange = 'logs';

async function sendMessage() {

    const message = 'disk is full!';

    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        // producer will send messages to exchange named 'logs' whose type is 'fanout'
        // if server is down exchange goes down too since durable option is false
        await channel.assertExchange(exchange, 'fanout', { durable: false});

        // publishing to exchange named 'logs'
        channel.publish(exchange,'', Buffer.from(message));
        console.log("[x] Sent: %s", message);

        // connection is closed after 0.5sec
        setTimeout(() => {
          connection.close();
        }, 500);
    } catch (error) {
        console.error('Error consuming task:', error);
    }
}

sendMessage();