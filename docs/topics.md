# Topics

이전 튜토리얼에서 단순히 모든 메시지를 무작위로 broadcast하는 `fanout` exchange 대신, `direct`exchange를 사용해 로그를 선택적으로 수신할 수 있도록 하였다. `direct` exchange를 사용하면서 시스템이 개선되긴 했지만, 여전히 한계가 있다. 바로 여러 기준에 따라 메시지를 라우팅할 수 없다는 점이다.

예를 들어, 로깅 시스템에서 단순히 로그의 심각도(severity)에 따라 메시지를 특정 Queue에 전달하는 것이 아닌, 로그를 발생시킨 소스(source)에 따라 메시지를 전달하고 싶을 수 도 있다. 예를 들어 심각도(trace, debug, info, warn, error)에 따라 로그를 구분하여 받거나, 발생 위치(io/auth/kernel)로 구분하여 로그를 따로 받고 싶을 수 있다.

이런 방식은 훨씬 더 유연하게 로그 메시지를 구분하여 전달할 수 있게 한다. 예를 들어, `cron`에서 발생한 **치명적인 오류(critical errors)**만 받고 싶을 수도 있고, `kern`에서 발생하는 **모든 로그**를 받고 싶을 수도 있습니다.

이러한 기능을 로깅 시스템에 구현하려면, 이제 더 복잡한 **topic exchange** 개념을 배워야 한다.

# 1. Topic Exchange

`topic` 타입의 exchange로 전송되는 메시지는 아무 routing-key나 가질 수 없다.

반드시 점(.)으로 구분된 단어들의 목록 형태여야 한다.

예를 들어 다음과 같은 네이밍이 `topic` exchange_type에서 routing key로 가능하다: `stock.usd.nyse`, `nyse.vmw`, `quick.orange.rabbit`.

Consumer에서 설정하는 binding key 역시 동일한 형식을 따라야한다. Topic Exchange의 라우팅 로직은 Direct Exchange와 유사하다. 특정 routing key로 전송된 메시지는, 해당 메시지의 routing key와 매칭되는 binding key를 가진 모든 큐에게 전달된다.

→ 즉, 한 개의 메시지가 두 개 이상의 queue에게 전달될 수 있다는 뜻이다!

→ 메시지의 routing key와 queue의 binding key가 맞아떨어진다면 무조건 메시지를 받을 수 있다는 것이다!

# 2. Binding Key WildCard

다음은 binding key에만 적용되는 두 가지 특별한 규칙이다.

1.  `*` (star) 는 오로지 한 개의 단어에 대한 와일드 카드이다.
2.  `#` (hash) 는 0개 아니면 2개 이상의 단어에 대한 와일드 카드이다.

→ routing key에는 절대 와일드카드를 사용할 수 없다! 와일드 카드는 binding key에서만 사용가능하다.
