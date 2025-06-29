# Dead-Letter-Exchange

## What is a Dead Letter Exchange

dead-letter는 Queue에 들어왔지만 아래와 같은 상황들로 인해 메시지 처리 실패, 폐기 처분된 메시지들을 의미한다.

### 1. 메시지 만료 (expiration)

메시지에 설정된 TTL(Time-To-Live)을 초과하면, 해당 메시지는 큐에서 제거되고 DLX로 전달된다.

### 2. Consumer 측에서의 `channel.reject(msg, false)` 호출 시

Consumer 측에서 메시지를 명시적으로 거부하는 reject 가 호출되고 requeue 작업을 하지 않도록 두번째 인자가 false로 설정되었을 경우, Queue로 해당 메시지를 재전송하지 않고 DLX로 버린다.
보통 메시지 형식이 맞지 않거나, 처리될 수 없는 형식인 경우 명시적으로 메시지 거부 처리를 한다.

### 3. Consumer 측에서 `channel.nack(msg, false, false)` 호출 시

nack은 negative acknowledgement의 줄임말로, consumer 측에서 해당 메시지가 정상적으로 처리되지 않았음을 알리기 위해 호출하는 함수이다. 이는 메시지를 reject 하지는 않아도 되지만, 내부적으로 처리하는 과정에서 오류가 나 메시지 처리가 정상적으로 되었다는 ack 신호 대신 nack 신호를 보내는 것이다. requeue에 대한 여부인 세번째 인자를 false로 놓을 시, Queue로 재진입하는 것이 아니라 바로 DLX로 전달된다.

### 4. Queue의 최대 메시지 초과 (maxLength)

큐에 설정된 최대 메시지 수(x-max-length)를 초과하면, 가장 오래된 메시지부터 자동으로 제거되며, 제거된 메시지는 DLX로 전송된다.

DLX는 일반적인 Exchange와 동일하게 작동하며, 기존의 exchange type인 direct, fanout, topic 등을 그대로 사용할 수 있다.

단지, 메시지 Producer가 Queue인 것 뿐이다.

## How to declare x-dead-letter-exchange

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

DLX는 queue-level의 advanced-option 으로 위와 같이 `assertQueue` 호출 시 arguments 내부에서 설정한다. 따라서 DLX 관련 설정은 Consumer 측에서 선언해줘야한다.

이때 주의해야할 것이, Dead-Letter-Exchange가 있으면 그것과 연결될 Queue가 미리 선언되어 있어야한다는 것이다.

`x-dead-letter-exchange`는 죽은 메시지(dead-letter)를 어디로 보낼지를 선언하는 것이지만, DLX가 라우팅한 메시지를 받아줄 queue가 없다면 메시지는 DLX로 전달되지만 결국 유실되거나 폐기처분(discard)된다. 즉, dead-letter를 exchange로부터 받아줄 queue와 바인딩해주지 않는다면 dead-letter가 실제로 소비되지 못한다는 것이다.

따라서 DLX를 사용하기 위해 arguments로 넣었다면, Dead-Letter-Exchange -> Dead-Letter-Queue (dead-letter 전용 queue)에 대한 바인딩은 필수다.

## Only One DLX Allowed per Queue

```javascript
channel.assertQueue("my.queue", {
  arguments: {
    "x-dead-letter-exchange": "dlx.exchange",
  },
});
```

해당 queue에서 dead-letter로 전환된 메시지는 무조건 설정된 DLX로 보내진다. Queue는 Exchange처럼 라우팅 기능이 없어 그대로 exchange로 전달만 해줄 수 있기 때문이다.
추가로 다른 DLX를 설정하려고 한다면, 기존 설정이 덮어씌워지거나 에러를 낸다.

## Dead-Letter Routing Scenarios

Dead-Letter로 판단이 되려면 일단 Queue안으로 들어와야한다.
그리고 Queue에 들어왔다는 것은 일단 Exchange와 binding된 키에 맞는 routingKey를 가진 메시지였다는 것이다. 따라서 dead-letter로 전환되는 이유는 위와 같이 Queue의 속성이나 메시지 처리 결과에 따른 것들이다.

참고로 Exchange 단에서 어떤 Queue에도 라우팅되지 못하고 버려지는 메시지들은 DLX로 전달되지 않는다. DLX는 Queue 단에서 Exchange로 전달되는 용도이기 때문이다.

## DLX cannout be RPC

DLX는 단방향 exchange이다!

DLX는 오류처리 또는 유실 방지 용도이다. 메시지 처리 중 실패하면, 그 메시지를 별도의 DLX Queue로 보내서 나중에 처리하거나 조사할 수 있게 하는 것이다. 따라서 DLX는 메시지를 응답용으로 라우팅하지 않고, 그냥 실패 메시지를 따로 처리하기 위해 모아두는 역할이기 때문에 RPC 패턴은 사용하지 않는다.
