import amqp from 'amqplib';

const exchange = 'logs';

async function sendMessage() {

    const message = 'disk is full!';

    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        // 메시지 보낼 Exchange 선언
        await channel.assertExchange(exchange, 'fanout', { durable: false});

        // Exchange로 메시지 전송
        // fanout exchange_type이기 때문에 routingKey는 설정안해도 됨
        channel.publish(exchange, '', Buffer.from(message));
        
        console.log("[x] Sent: %s", message);

        // 메세지 보내기 전 종료되는 것을 막기 위해 timeout 설정해줌
        setTimeout(() => {
          connection.close();
        }, 500);
    } catch (error) {
        console.error('Error consuming task:', error);
    }
}

sendMessage();