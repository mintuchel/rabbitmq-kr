# Queue Options

```javascript
channel.assertQueue("email.queue", {
  durable: true,
  autoDelete: false,
  exclusive: false,
  arguments: {
    "x-message-ttl": 30000,
    "x-dead-letter-exchange": "dlx.exchange",
    "x-dead-letter-routing-key": "dlx.email",
    "x-max-length": 500,
    "x-max-priority": 5,
    "x-queue-type": "classic",
  },
});
```

# Standard Queue Options

## 1. durable

서버 재시작 이후에도 큐가 유지될지 여부

RabbitMQ 서버가 죽어도 Queue는 살아있게 된다. 재시작 후에도 Queue는 보존되어 있다.

메시지까지 살아있으려면 메시지 전송 시 `persistent: true` 로 해서 보내줘야한다!

→ durable 옵션은 Queue의 영속성만 보장하는 것이지 메시지의 영속성까지 보장해주지는 않는다!

## 2. exclusive (독점큐)

독점큐로 선언된 큐는 오로지 한 개의 connection에게만 물릴 수 있다.

같은 connection에서 파생된 여러 channel에서는 동시 접근이 가능하다. 하지만 아예 다른 connection에서 독점큐로는 접근이 불가하다.

해당 connection이 끊기면 자동으로 삭제된다.

→ exclusive와 durable은 같이 쓸 수 없음! exclusive 자체가 일시적인 큐 전용이라고 선언하는거라 자동으로 durable: false로 설정됨.

## 3. autoDelete

큐가 어떤 consumer와도 연결되어있지 않을때 자동으로 삭제됨

큐가 사용 중인 동안은 유지되고, 마지막 Consumer가 Queue를 해제(Unsubscribe)할때 삭제된다.

즉, true일때 모든 Consumer가 끊긴 후에 자동으로 삭제됨

# Advanced Queue Arguments

## 1. messageTTL (message Time to Live)

해당 큐에 발행되는 메시지의 TTL
각 메시지마다 Queue에 들어온 시점을 기준으로 측정되는 단일 타이머로, 재발행되어 다시 들어올 경우 새로운 TTL이 시작된다! (즉, 누적시간이 아니다)

## 2. deadLetterExchange

메시지가 거부(reject)되거나 만료(expired)되었을때 보내질 Exchange

```javascript
channel.assertQueue("my_queue", {
  durable: true,
  arguments: {
    "x-dead-letter-exchange": "my_dead_letter_exchange",
    "x-dead-letter-routing-key": "dead_letter_key",
  },
});
```

`assertQueue` 호출 시 deadLetterExchange와 deadLetterRoutingKey 옵션을 설정하면, 메시지가 만료되거나, reject 되고 requeue되지 않았거나, queue가 가득 찼을때 해당 메시지가 자동으로 지정된 Dead Letter Exchange로 라우팅된다!

이때 물론 해당 `x-dead-letter-exchange`는 미리 `assertExchange` 되어있어야한다!

## 3. deadLetterRoutingKey

`x-dead-letter-routing-key`

deadLetterExchange로 보낼때 사용될 라우팅 키

## 4. maxLength

큐에 허용되는 최대 메시지 개수

## 5. maxPriority

메시지 우선순위 설정 시 사용
중요한 작업을 먼저 처리해야하는 상황일때 사용한다.

```javascript
// 1. 메시지 발행 시 해당 메시지의 우선순위 값 설정
await channel.publish(
  "jobs_exchange", // exchange 이름
  "jobs.routing.key", // 라우팅 키
  Buffer.from("Important task"),
  {
    priority: 8, // 우선순위 높음 (0~10 중 8)
    persistent: true, // durable queue에선 꼭 이거 설정
  }
);
```

```javascript
// 2. 우선순위 옵션있는 Queue 선언
await channel.assertQueue("priority_jobs", {
  durable: true,
  arguments: {
    "x-max-priority": 10, // 최대 우선순위 값 지정. 우선순위는 0~10 사이 사용 가능
  },
});
```

위 예제와 같이 Publisher 쪽에서 우선순위를 지정하여 메시지를 발행할 수 있고,
Consumer 쪽에서는 x-max-priority 설정을 통해 우선순위 값 허용범위를 지정할 수 있다.

# Best Practices for Queue Options

### duarable

durable: true + DLX 조합은 실무에서 기본 중 기본이다.
메시지 브로커의 최대 장점 중 하나가 메시지 유실 방지와 메시지 복구인데, 이걸 가능하게 만드는 옵션이 durable 과 DLX 세팅이다.

### deadLetterExchange

실패 메시지를 유실하지 않고 처리하기 위해 실무에서는 99% DeadLetterExchange로 보낸다.

### messageTTL

대부분 시간에 민감한 작업처리용 Queue에서 사용한다
일정 시간 내 처리되지 않은 메시지는 DeadLetterExcange로 이동하게 설계한다.
