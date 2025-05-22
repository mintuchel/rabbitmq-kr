import amqp from 'amqplib';

const queue = 'task_queue';

async function receiveMessage() {
  try {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    await channel.assertQueue(queue, {
      // 큐가 지속성을 가지게 하여, rabbitmq가 재시작돼도 큐가 유지되도록 함
      durable: true
    });

    console.log('[*] Waiting for messages in ${queue}. To exit press CTRL+C');

    // 큐로부터 메시지를 지속적으로 받음
    // 콜백함수(msg) => { } 는 메시지가 들어왔을때 실행됨
    channel.consume(queue, (msg) => {
      if (msg != null) {
        console.log("[x] Received %s", msg.content.toString());
        // 메시지 처리 완료 확인을 RabbitMQ에게 전송
        // ACK 안보내면 이 메시지가 아직 처리되지 않았다고 판단하고 메시지는 큐에서 사라지지 않고 남아있음
        channel.ack(msg);
      }
    }, {
      // 수동 ACK 신호 전송하겠다는 의미
      noAck: false
    })
  } catch (error) {
    console.error('Error receiving message:', error);
  }
}

receiveMessage();