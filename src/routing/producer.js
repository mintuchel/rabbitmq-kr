import amqp from 'amqplib';

const exchange = 'direct_logs';

async function produceMessages() {

    const severity = 'error'; // Routing Key
    const message = 'disk is full!';

    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        // producer will send messages to exchange named 'logs' whose type is 'fanout'
        // if server is down exchange goes down too since durable option is false
        await channel.assertExchange(exchange, 'direct', {
            durable: false
        });

        // we will publish to exchange named 'direct_logs'
        // the messages we are publishing will have routing key set as 'severity'
        channel.publish(exchange, severity, Buffer.from(message));
        console.log("[x] Sent: %s", message);
        
        // connection is closed after 0.5sec
        setTimeout(() => {
            connection.close();
        }, 500);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

produceMessages();