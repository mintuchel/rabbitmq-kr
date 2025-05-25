# Publish/Subscribe

전 단계까지는 하나의 메시지가 하나의 worker에게만 전달되었다. 하지만 지금부터는 하나의 메시지를 다수의 worker들에게 전송하는 방식을 배워볼 것이다.

즉 이제까지는 한 개의 메시지가 한 개의 worker에게만 전달되었지만 이제부터는 한 개의 메시지를 여러 worker들에게 전달해보는 연습을 할 것이다.

# 1. Exchanges

사실 RabbitMQ에서 Producer가 직접 메시지를 Queue에 집어넣는 것이 아니다. 실은 Producer는 자신의 메시지가 Queue에 전송이 됬는지도 모른다.

Producer는 Queue에 직접 메시지를 전송하지 않는 대신, Exchange에게 메시지를 전달한다.

Exchange는 메시지를 Producer들에게 받고 받은 메시지들을 Queue에 Push 해준다.

즉, Exchange는 메시지를 "쌓지 않고", 수신 즉시 binding된 queue로 라우팅하는 "중계기" 역할만 한다.

따라서 Exchange는 자신이 받은 특정 메시지로 어떤 작업을 해야하는지 명확히 알고 있어야한다.

특정 메시지를 특정 Queue에 넣어야할까? 여러 Queue에 동시에 넣어야할까? 아니면 메시지를 그냥 버려야할까? 와 같은 판단을 내릴 수 있어야한다.

이런 판단을 내릴 수 있도록 도와주는 것이 `exchange_type`이다.

- producer : 메시지를 전송하는 user application
- exchange : producer에게 받은 메시지를 알맞는 queue에게 전달하는 중계기
- queue : producer가 전송한 메시지를 저장하는 버퍼
- consumer : 메시지를 받는 user application

## 1-1) Exchange 선언 함수

`assertExchange` 함수를 통해 해당 채널에서 사용할 Exchange를 선언할 수 있다

```jsx
channel.assertExchange(exchange_name, exchange_type, { durable: false });
```

만약 주어진 이름의 Exchange가 존재하지 않으면 새 Exchange를 생성한다.

이미 해당 exchange_name의 exchange가 존재한다면 기존 exchange를 사용한다.

exchange_type과 durable 설정을 통해 Exchange에 대한 설정을 정의할 수 있다.

→ durable : false 이므로 서버 재시작 시 exchange는 삭제됨

## 1-2) Exchange Type 종류

`exchange_type`으로는 아래와 같은 종류가 있다.

| exchange_type | 설명                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| FANOUT        | 들어온 메시지를 바인딩된 모든 큐로 broadcast한다. `routingKey`를 무시한다. |
| DIRECT        | `routingKey` 가 정확히 일치하는 큐에만 전달                                |
| TOPIC         | 와일드카드 패턴(`*`, `#`)을 이용한 유연한 라우팅이 가능                    |
| HEADERS       | `routingKey` 대신 헤더 속성을 기반으로 메시지를 라우팅함.                  |

## 1-3) Default Exchange

그럼 지금까지 Exchange를 직접 선언하지 않았는데 어떻게 동작했을까?

```jsx
channel.sendToQueue("hello", Buffer.from("Hello World!"));
```

위와 같이 exchange를 명시적으로 지정하지 않고 메시지를 보낼 경우 default exchange인 built-in direct type exchange가 사용된다. `sendToQueue`는 내부적으로 아래와 같은 함수를 호출한다.

```jsx
channel.publish("", "hello", Buffer.from("Hello World!"));
```

이때 publish 첫번째 인자인 `‘’`는 default Exchange를 의미한다.

# 2. Anonymous Queues (익명 큐)

지금까지는 특정 Queue 이름을 명시해서 사용했다. Producer와 Consumer가 동일한 Queue를 사용하게 하기 위해서는 Queue의 이름을 명시하여 공유할 수 있도록 해야했다.

하지만 로그를 기록하는 Logger 같은 경우는 모든 Producer들로부터 Log 기록을 받아야하므로 각 Producer와 Log 메시지를 전달하는 Queue가 필요하다. 하지만 모든 Producer를 한 개의 Queue와 명시적으로 연결시킬 경우, 해당 Queue에 과부하가 올 수 있다. 따라서 각 Producer마다 개별적인 Queue를 생성하여 로그 기록을 전달하게 해야한다.

이때 Producer가 실행될때 자동으로 익명 큐를 만들어서 Consumer에게 전달하는 방식을 사용할 수 있다.

```jsx
channel.assertQueue("", { exclusive: true });
```

위와 같이 `assertQueue`의 첫번째 인자를 `‘’` 빈 문자열로 놓을 시 익명 큐를 생성할 수 있다.

익명 큐는 RabbitMQ가 자체적으로 생성하는 random queue로 `amq.gen-JzTY20BRgKO-HjmUJj0wLg` 이런 형식의 이름을 가지게 된다.

Producer가 다운되면 `exclusive : true` 조건에 의해 해당 익명 큐도 내려가게 된다.

# 3. Bindings

이제 Exchange 와 Queue를 생성했으니 이제는 Exchange에게 Queue로 메시지를 전달하라고 명령해야한다. 이러한 Exchange-Queue 를 매핑해주기 위해 관계를 정의하는 작업을 Binding 이라고 한다.

```jsx
channel.bindQueue(queue_name, "logs", "");
```

`logs` 라는 이름의 Exchange를 `queue_name` 이름의 Queue와 Binding 하라는 뜻이다.

## Q: 만약 Exchange와 Binding된 Queue가 하나도 없다면?

Exchange는 **중간 분배자**일 뿐이다. 따라서 Queue**가 하나도 바인딩되지 않은 상태에서 메시지가 오면**, **그 메시지는 즉시 유실된다.**

1. **Exchange는 메시지를 저장하지 않는다.**
2. **바인딩된 Queue가 없으면 Exchange로 들어온 메시지는 사라진다.**
3. **Consumer보다 Queue가 먼저, Queue보다 Exchange가 먼저 생성돼야 한다.**

# 4. RabbitMQ에서의 Producer와 Consumer의 역할

## 4-1) Producer와 Consumer가 공통적으로 해야할 사항

자신이 사용할 Exchange는 명시해야한다.

즉, `assertExchange`는 두 곳에서 모두 필수적으로 존재해야한다.

## 4-2) Producer

그저 자신이 사용할 Exchange를 알고 message를 전송하기만 하면 된다.

따라서 Producer는 Queue를 알필요가 없다.

`assertExchange`와 `publish`만 해주면 된다.

오직 Exchange에 메시지를 전송하는 것만 신경쓰면 된다.

1. `channel.assertExchange(name, type)`
2. `channel.publish(exchange, routingKey, message)`

## 4-3) Consumer

특정 Queue에 들어온 메시지를 수신만 하면 된다.

하지만 특정 Exchange를 사용 시, 해당 Exchange와 Queue를 매핑시켜줘야한다.

따라서 특정 조건(routingKey)에 따라 Exchange와 Queue을 연결시켜주는 `bindQueue`까지 해주는 책임을 가지고 있다.

1. `channel.assertExchange(name, type)`
2. `channel.assertQueue(queueName)`
3. `channel.bindQueue(queueName, exchange, routingKey)`
4. `channel.consume(queueName, callback)`

## 4-4) 따라서 Consumer를 Producer보다 먼저 생성해야한다!

Producer를 먼저 생성하면, Exchange로 들어온 메시지를 받아줄 Queue가 없어 메시지가 유실된다!

따라서 Exchange와 Queue를 모두 미리 세팅해주는 Consumer 부터 띄워야 메시지 유실 없이 안전하게 메시지 전송을 보장할 수 있다.
