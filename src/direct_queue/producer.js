import amqp from 'amqplib';

const queue = 'task_queue';

async function sendMessage() {
  try {
    // 비동기적인 rabbitmq 서버 연결
    const connection = await amqp.connect('amqp://localhost');
    // 메시지를 주고 받기 위한 채널 생성
    const channel = await connection.createChannel();

    const msg = 'Hello, RabbitMQ!';

    // task queue 가 존재하지 않으면 새로 생성, 존재하면 그냥 넘어감
    await channel.assertQueue(queue, {
      // 큐가 지속성을 가지게 하여, rabbitmq가 재시작돼도 큐가 유지되도록 함
      durable: true
    });

    // 큐로 실제 메시지를 보냄
    channel.sendToQueue(queue, Buffer.from(msg), {
      // 메시지도 디스크에 저장되도록 설정하여 RabbitMQ가 죽더라도 메시지가 보존되게 함
      persistent: true
    });

    console.log(`[x] Sent '${msg}'`);

    // 즉시 닫으면 메시지가 전송되기도 전에 연결이 끊길 수 있으므로 약간의 지연시간을 주고 닫기
    setTimeout(() => {
      connection.close();
    }, 500);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

sendMessage();