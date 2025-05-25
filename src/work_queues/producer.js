import amqp from 'amqplib';

const queue = 'work_queue';

async function produceTasks() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        
        // 사용할 큐 선언
        await channel.assertQueue(queue, { durable: true });

        // 10개의 메시지를 큐에 전송
        // 튜토리얼이므로 메시지의 영속성을 보장하는 persistent는 false로 설정
        for (let i = 1; i <= 10; i++) {
            channel.sendToQueue(queue, Buffer.from(i.toString()), { persistent: false });
            console.log("[x] %s Task PRODUCED", i);
        }

        // 메시지 보내기 전 종료를 방지하기 위해 timeout 설정
        setTimeout(() => {
          connection.close();
        }, 500);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}
    
produceTasks();