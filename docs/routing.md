# Routing

직전의 Publish/Subscribe 방식으로 간단한 로깅 시스템을 만들었다. 우리는 로그 메시지를 여러 Consumer들에게 broadcasting 방식으로 전송할 수 있었다.

이번에는 각 Consumer들이 특정 메시지들만 전달받을 수 있게 할 것이다. 예를 들어 전체 로그 메시지가 아닌 치명적인 로그들만 메시지큐를 통해 로그 파일에 적히도록 하고, 가벼운 로그들은 메시지큐를 거치지 않고 바로 콘솔에 찍히게 할 수 있다.

# 1. Bindings

Publish/Subscribe 방식에서 Binding 기법을 배웠다.

Binding은 Exchange와 Queue 간의 관계이다. 특정 Queue가 해당 Exchange에 의해 전달된 메시지를 받겠다 라고 해석할 수 있다.

```jsx
channel.bindQueue(q.queue, exchange, "");
```

기존에는 위와 같이 세번째 인자를 빈칸으로 남겨두었다.

하지만 `bindqueue`는 추가적으로 세번째 인자로 binding key 인자를 받을 수 있다.

아래와 같이 특정 binding key를 명시함으로써 특정 Queue에게만 메시지를 전송하게 할 수 있다.

```jsx
channel.bindQueue(queue_name, exchange_name, "black");
```

binding key는 exchange_type에 영향을 받을 수 있다.

`fanout` exchange_type일 경우에는 모든 Queue에게 broadcast하는 방식이므로 세번째 인자인 binding key가 무시된다. 하지만 `direct`나 `topic` 방식의 경우 binding key에 따라 각 Queue에게 메시지 전달 여부를 통제할 수 있다.

# 2. Sending Messages By Direct Exchange using Routing Key

직전의 Publish/Subscribe 방식으로 만든 로그는 broadcasting 방식을 통해 모든 consumer들에게 메시지를 보냈다. 하지만 routing key를 통해 특정 consumer 들에게만 전송되게끔 하여 메시지 전송 측면에서 유연성을 부여할 수 있다.

기존에 사용했던 fanout 타입은 routingkey를 무시하고 모든 consumer에게 전송한다.

따라서 direct exchange를 사용하고 두번째 인자로 특정 routingKey를 부여할 것이다.

```jsx
channel.assertExchange(exchange_name, "direct", { durable: false });

channel.publish(exchange, routingKey, Buffer.from(msg));
```

→ 이 의미는 해당 exchange로 routingKey 타입의 msg를 보내겠다는 것이다

이렇게 하면 해당 메시지는 자신의 routingKey와 매칭되는 bindingKey를 가진 Queue에게만 전송된다.

(The routing algorithm behind a `direct` exchange is simple - a message goes to the queues whose `binding key` exactly matches the `routing key` of the message.)

# 3. Receiving Messages By Binding Key

Consumer 쪽에서는 자신이 특정 Queue로부터 특정 타입의 메시지만 받겠다고 선언할 수 있다.

```jsx
channel.bindQueue(q.queue, exchange, bindingKey);
```

위와 같이 bindQueue에서 세번째 인자로 bindingKey를 명시함으로써 해당 Exchange로부터 전송되는 메시지 중 어떤 타입의 메시지를 받을 지 선언할 수 있다.

이때 해당 Consumer가 받는 메시지들은 routingKey와 bindingKey가 매칭되는 메시지들이다.

이처럼 direct 타입의 Exchange로부터 메시지를 받기 위해서는 특정 Routing Key를 가진 메시지를 받겠다는 Queue와 binding을 해줘야한다.

# 4. Direct Exchange에서는 Routing Key로 와일드 카드 패턴을 사용할 수 없다

Direct Exchange의 특징이 정확히 일치하는 routing key만 매칭시켜준다는 것이다.

즉, **`routing key == binding key`** 여야 Queue로 메시지가 전달됩니다.

와일드카드 패턴을 routingKey로 사용하고 싶으면 topic 타입의 exchange여야한다.
