import amqp from 'amqplib';

const queue = 'work_queue';

async function fetchTasks() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        // 사용할 Queue 선언
        await channel.assertQueue(queue, { durable: true });

        // 메시지를 받았다면 콜백함수 실행
        channel.consume(queue, function (msg) {
            if (msg != null) {
                console.log("[x] %s task RECIEVED", msg.content.toString());
                // ack 신호 전송
                channel.ack(msg);
                // 타 worker가 task를 받을 수 있도록 timeout 설정
                setTimeout(function() { }, 1000);
            }

            setTimeout(function () {
                console.log("[x] %s task DONE", msg.content.toString());
            }, 1000)
        }, {
            noAck: false
        })
    } catch (error) {
        console.error('Error sending message:', error);
    }
}
    
fetchTasks();