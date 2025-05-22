import amqp from 'amqplib';

const exchangeName = 'topic_logs';

async function produceMessages() {

    const message = 'topic log message';

    // routing key array
    var routingKeyArray = new Array("quick.orange.rabbit", "lazy.orange.elephant", "quick.orange.fox", "lazy.brown.rabbit", "lazy.pink.rabbit");
    
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        await channel.assertExchange(exchangeName, 'topic', {
            durable: false
        });

        for (var i = 0; i < 5; i++) {
            channel.publish(exchangeName, routingKeyArray[i], Buffer.from(message));
            console.log("[x] Sent: %s", message);
        }

        setTimeout(() => {
            connection.close();
        }, 500);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

produceMessages();