# 1. Message Acknowledgement

RabbitMQ는 메시지를 Consumer에게 전달하자마자 해당 메시지를 삭제를 위해 마커 표시를 해놓는다.

이때 Consumer가 메시지에 대한 작업을 처리하는 도중에 죽게된다면, Consumer는 자신이 처리하던 작업에 대한 message를 잃게 된다. worker 재시작 시 처리를 하다만 메시지를 다시 받아서 처리하는 과정을 거쳐야하는데, Producer는 이미 해당 메시지를 삭제했고 Consumer는 자신이 처리하던 message를 기억하지 못하기 때문에 메시지가 유실되어버리는 결과를 낳는다.

따라서 이렇게 Consumer가 죽었을때 메시지 유실을 방지하기 위해 ACK라는 신호를 Consumer가 Producer에게 보낼 수 있게 한다. ACK는 Consumer가 Producer에게 보내는 일종의 신호로, 자신이 받은 특정 메시지에 대한 처리가 성공적으로 완료되었음을 알리는 것이다. 따라서 Producer가 Consumer로부터 메시지에 대한 ACK 신호를 받았을 시, 해당 메시지를 삭제한다.

`noAck: true` 로 설정을 하면, Consumer가 메시지를 받으면 자동으로 Ack 처리가 된다. 그래서 메시지 처리가 실패하더라도 Producer가 알 수 있는 방법이 없어 메시지 성공 여부를 모르게 된다. 즉, 메시지가 손실되더라도 감지하지 못하기 때문에 실무에서는 무조건 `noAck: false`를 사용한다.

`noAck: false` 일 경우, 직접 `channel.ack` 과 `channel.nack`을 명시적으로 호출하여 메시지 성공/실패에 대한 여부를 Producer에게 전달해야한다. 만약 명시적으로 호출하지 않는다면, 처리가 완료된 메시지도 계속 남는 문제가 발생한다.

동일한 메시지에 대해 중복으로 channel.ack을 호출했을 시에는 이미 첫번째 호출 이후 메시지가 Queue에서 삭제되어버려 아래와 같은 에러가 발생한다.

```jsx
Error: Unknown deliveryTag X
```

만약 Consumer가 ACK 신호를 보내기 전에 죽는다면(channel이 닫히거나, connection을 잃어버렸을 경우), RabbitMQ는 해당 메시지에 대한 처리가 완료되지 않았음을 인지하고 다시 Queue에 집어넣는 re-queue 작업을 거친다. 만약 해당 메시지를 처리할 수 있는 다른 Consumer가 존재한다면, 해당 메시지를 다른 Consumer에게 전송해 처리하도록 한다.

이렇게 ACK + 여러 Consumer를 통해 처리할 경우, Consumer가 죽을 경우 메시지가 유실될 일도 없고, 한 개의 Consumer가 죽었다고 해서 해당 메시지를 처리하지 못하는 상황도 방지할 수 있다.

# 2. Negative Acknowledgement

```jsx
channel.nack(msg, allUpTo, requeue);
```

메시지 처리를 시도했지만 실패한 경우에 호출한다.

인자값을 통해 다시 처리할지 말지를 결정할 수 있다.

다시 큐에 넣지 않고 폐기를 하면 Dead-Letter-Exchange로 전달한다.

1. `msg` : 처리 실패를 알릴 메시지 객체
2. `allUpTo` : true일 경우, msg까지의 모든 이전 메시지들도 함께 nack 처리해준다. Batch 작업에 좋다.
3. `requeue`: true이면 메시지를 큐에 다시 넣고, false이면 큐에서 제거하고 DLX 설정이 되어있다면 DLX로 보낸다.

만약 `noAck: false` 이지만 ack/nack를 명시적으로 호출하지 않는다면, 메시지는 계속 큐에 남아있게 된다.

messageTTL이 정의되어있으면 모르지만 TTL 설정도 안되어있고 nack을 사용하면서 requeue:true로 한다면 무한 반복 소비가 될 수 있으므로 조심해야한다.

`nack(msg, false, false)` : 이 메시지 하나만 실패 처리하고, 다시 큐에 넣지 않음 (바로 DLX 이동)

`nack(msg, false, true)` : 이 메시지 하나만 실패 처리하고, 다시 큐에 넣어 재시도 함

`nack(msg, true, false)` : 이 메시지 포함, 이전 모든 메시지를 실패 처리하고 DLX로 보냄

# 3. reject

```jsx
channel.reject(msg, requeue);
```

메시지 처리하기 전에 거부하는 경우이다.

1. `msg` : 거부할 메시지 원본 객체
2. `requeue` : 재시도에 대한 여부. true 이면 requeue 하고, false 이면 DLX로 전달한다.

nack과 동일하나 batch 처리가 불가능하다.

기능은 nack(msg, false, requeue)와 같지만, 보통 처리하기전에 메시지 형식이나, 메시지 객체 내 설정값들이 옳지 않아서 받자마자 거부하는 경우에 사용한다.
