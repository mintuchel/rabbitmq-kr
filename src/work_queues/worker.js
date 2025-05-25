import amqp from 'amqplib';

const queue = 'work_queue';

async function fetchTasks() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        // if task_queue doesnt exist, it creates new queue
        // due to durable option, the task_queue lasts even if server goes down
        await channel.assertQueue(queue, {
            durable: true
        });

        // if consumed, callback function is called
        channel.consume(queue, function(msg) {
            if (msg != null) {
                console.log("[x] %s task RECIEVED", msg.content.toString());
                
                channel.ack(msg);
                setTimeout(() => {
                    
                }, 1000);
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