# Exchange Options

## 1. durable

서버 재시작 후에도 Exchange가 유지될지에 대한 여부
실무에서는 거의 항상 true로 설정한다

## 2. autoDelete

해당 Exchange와 바인딩된 Queue가 하나도 없을 경우, Exchange는 자동으로 삭제된다.

Exchange가 하나 이상의 Queue에 바인딩되어있다가, 더 이상 바인딩된 Queue가 없는 상황이 되면 그 시점에서 Exchange는 자동으로 삭제된다!

임시 Exchange 역할일때 사용한다. 해당 Exchange로 메시지가 빈번하게 전송되지 않을 경우 사용한다.

보통 broadcast용 `FANOUT` 구조에서 임시 Exchange 역할을 할때 사용한다(short-lived 통신 구조).

따라서 `durable: false` + `autoDelete: true` 조합은 일회성 용도로 자주 사용된다

## 3. internal

`internal: true` 로 설정된 Exchange는 외부에서 직접 publish 할 수 없다.

즉, 특정 Client (Publisher)가 직접 메시지를 publish 하려고 하면 `403 ACCESS_REFUSED` 에러가 발생한다.
Exchange → Exchange 경로 (즉, exchange-to-exchange binding)에서만 메시지를 받을 수 있도록 제한하는 옵션이다.

## 4. alternateExchange

메시지를 라우팅할 수 없는 경우 Fallback으로 메시지를 보낼 Exchange 이름

해당 Exchange에서 그 어떠한 Queue로 갈 수 없는 경우 = 라우팅 실패한 메시지에 대한 유실 방지용이다.

하지만 대체로 실무에서 안쓰인다. 왜냐하면 보통 Exchange에서 Queue까지는 메시지가 전달되기 때문이다. 보통 Queue에 들어오긴 하는데, Queue에서 메시지 처리에 실패하는 경우가 많아 메시지 유실 방지에 대한 처리는 Queue 단에서 DLX로 99% 처리한다. 따라서 alternateExchange를 사용하지말고 메시지 유실에 대한 방지와 처리는 DLX를 구축하여 처리하는게 낫다고 한다.
