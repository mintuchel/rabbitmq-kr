import amqp from 'amqplib';

const exchange = 'topic_logs';

async function produceMessages() {

    const message = 'topic log message';

    // 여러 종류의 routingKey 배열
    var routingKeyArray = new Array("quick.orange.rabbit", "lazy.orange.elephant", "quick.orange.fox", "lazy.brown.rabbit", "lazy.pink.rabbit");
    
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        // 사용할 Exchange 선언
        await channel.assertExchange(exchange, 'topic', { durable: false });

        for (var i = 0; i < 5; i++) {
            // Exchange로 특정 routingKey를 가진 메시지 전송
            channel.publish(exchange, routingKeyArray[i], Buffer.from(message));
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