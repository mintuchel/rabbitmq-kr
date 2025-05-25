import amqp from 'amqplib';

const exchange = 'direct_logs';
const routingKey = 'error';

async function produceMessages() {

    const message = 'disk is full!';

    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        // 사용할 Exchange 설정
        await channel.assertExchange(exchange, 'direct', { durable: false });

        // Exchange로 특정 routingKey를 가진 메시지 전송
        channel.publish(exchange, routingKey, Buffer.from(message));
        console.log("[x] Sent: %s", message);
        
        // 보내기 전 종료되는 것을 방지하기 위해 timeout 설정
        setTimeout(() => {
            connection.close();
        }, 500);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

produceMessages();