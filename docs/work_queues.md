Work Queue를 활용해서 큐에 들어오는 작업들을 여러 worker들에게 분배하여 처리할 수 있게 할 수 있다.

# 1. Round-robin Dispatching

Task Queue의 가장 큰 장점은 병렬처리를 쉽게 구현할 수 있다는 것이다. 작업이 밀리고 있거나 Queue로 들어온 Task들을 처리하는데 병목현상이 생긴다면 worker(consumer)들을 필요한만큼 더 추가만 해주면 되기 때문이다.

기본적으로 라운드 로빈 방식을 사용하면 RabbitMQ는 각 메시지를 순서대로 그 다음 worker들에게 분배해준다. 따라서 각 worker들은 평균적으로 동일한 갯수의 메시지를 받게 된다.

# 2. Message Acknowledgement

RabbitMQ는 메시지를 Consumer에게 전달하자마자 해당 메시지를 삭제를 위해 마커 표시를 해놓는다.

이때 Consumer가 메시지에 대한 작업을 처리하는 도중에 죽게된다면, Consumer는 자신이 처리하던 작업에 대한 message를 잃게 된다. worker 재시작 시 처리를 하다만 메시지를 다시 받아서 처리하는 과정을 거쳐야하는데, Producer는 이미 해당 메시지를 삭제했고 Consumer는 자신이 처리하던 message를 기억하지 못하기 때문에 메시지가 유실되어버리는 결과를 낳는다.

따라서 이렇게 Consumer가 죽었을때 메시지 유실을 방지하기 위해 ACK라는 신호를 Consumer가 Producer에게 보낼 수 있게 한다. ACK는 Consumer가 Producer에게 보내는 일종의 신호로, 자신이 받은 특정 메시지에 대한 처리가 성공적으로 완료되었음을 알리는 것이다. 따라서 Producer가 Consumer로부터 메시지에 대한 ACK 신호를 받았을 시, 해당 메시지를 삭제한다.

만약 Consumer가 ACK 신호를 보내기 전에 죽는다면(channel이 닫히거나, connection을 잃어버렸을 경우), RabbitMQ는 해당 메시지에 대한 처리가 완료되지 않았음을 인지하고 다시 Queue에 집어넣는 re-queue 작업을 거친다. 만약 해당 메시지를 처리할 수 있는 다른 Consumer가 존재한다면, 해당 메시지를 다른 Consumer에게 전송해 처리하도록 한다.

이렇게 ACK + 여러 Consumer를 통해 처리할 경우, Consumer가 죽을 경우 메시지가 유실될 일도 없고, 한 개의 Consumer가 죽었다고 해서 해당 메시지를 처리하지 못하는 상황도 방지할 수 있다.

# 3. Message Durability

ACK 신호를 통해 Consumer가 죽었을떄 메시지 유실을 방지하는 방법을 배웠다. 이번에는 durable 옵션을 통해 Producer가 죽었을때 메시지 유실을 막는 방법을 알아볼 것이다.

RabbitMQ가 종료되거나 죽었을때 Queue도 죽고 Queue 내부에 대기타던 메시지들도 모두 유실되게 된다. 이를 막기 위해서는 사용할 Queue를 정의하고, 해당 Queue에 메시지를 보낼때 `durable`과 `persistent` 옵션을 체크해줘야한다.

첫번째로 RabbitMQ가 다운되었을때 Queue는 살아있게 하기 위해서는 `assertQueue`로 Queue 선언 시 `durable`로 선언해줘야한다. `durable` 옵션은 Producer와 Consumer의 `assertQueue`에 모두 적용되어야한다.

```tsx
await channel.assertQueue(queue, { durable: true });
```

두번째로 메시지 유실을 방지하기 위해서는 메시지들을 disk에 저장해주는 `persistent` 옵션을 선언해줘야한다.

```tsx
await channel.sendToQueue(queue, Buffer.from(msg), { persistent: true });
```

위와 같이 sendToQueue 시 persistent 옵션을 적용해주면 메시지를 Queue 외 디스크에도 저장하라는 의미이다. 이 옵션이 없으면 메시지는 Queue에만 들어가고 디스크에 저장되지는 않아, RabbitMQ 서버가 꺼지면 유실될 수 있다.

또한 persistent 옵션 적용 시 메시지 유실을 막아주기는 하지만, 지속적인 Disk I/O 작업때문에 RabbitMQ의 성능이 저하될 수 있다는 점을 감안해야한다.

### Durability 구현에 따른 TradeOff

persistent를 사용하면 메시지 유실을 방지할 수 있지만 그에 따른 trade-off가 존재한다.

디스크에 저장하는 것이므로 메시지를 쓸 때마다 디스크에 접근하는 I/O 작업이 발생하고 이에 따라 메시지 처리 속도 저하에 따른 RabbitMQ의 전체적인 성능 저하의 원인이 될 수 있다.

# 4. Fair dispatch (prefetch)

작업 분배(dispatching)가 비효율적으로 될 수 도 있다. 예를 들어, 두 개의 worker가 있고 홀수 번호의 메시지는 처리 시간이 긴 작업(heavy work), 짝수 번호의 메시지는 처리 시간이 짧은 작업(light work)이라고 가정해보자.이 경우 한 worker는 계속 바쁘게 일하고, 다른 worker는 거의 아무 일도 하지 않게 됩니다. RabbitMQ는 이런 각 작업에 걸리는 소요시간을 알지 못하고, 단순히 메시지가 큐에 들어올 때마다 번갈아 가며 소비자에게 메시지를 분배한다.즉, 지금까지 배웠던 Message Queue는 아직 처리되지 않은(acknowledged되지 않은) 메시지의 수를 고려하지 않고, 무작정 n번째 메시지를 n번째 소비자에게 보내는 방식인 것이다.

이 문제를 해결하기 위해 `prefetch=1` 설정을 사용할 수 있다. 이 설정은 RabbitMQ에게 "한 번에 한 개의 메시지만 워커에게 전달하라"고 지시하는 것이다. 즉, worker가 이전 메시지를 처리하고 `ack`(확인)를 보내기 전까지는 다음 메시지를 보내지 않도록 하는 것이다. 그 대신, RabbitMQ는 아직 바쁘지 않은 다른 worker에게 메시지를 넘기게 된다. 이렇게 하면 worker 간에 작업이 보다 공평하게 분배되고, 한 worker가 과부하되는 상황을 방지할 수 있다.
