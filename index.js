import amqp from 'amqplib';

let connection;

export async function getConnection() {
    if (connection) return connection;

    connection = await amqp.connect('amqp://localhost');
    return connection;
}