import amqp from 'amqplib';

const queue = 'work_queue';

async function produceTasks() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        
        // 사용할 큐 선언
        await channel.assertQueue(queue, { durable: true });

        // sending 10 tasks directly to the queue
        for (let i = 1; i <= 10; i++) {
            channel.sendToQueue(queue, Buffer.from(i.toString()), { persistent: false });
            console.log("[x] %s Task PRODUCED", i);
        }

        setTimeout(() => {
          connection.close();
        }, 500);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}
    
produceTasks();