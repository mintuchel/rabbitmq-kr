# Message Properties

```jsx
channel.sendToQueue("my-queue", Buffer.from("hello"), {
  persistent: true,
  contentType: "application/json",
  messageId: "12345",
  correlationId: "abc-789",
  headers: {
    "x-custom-header": "value",
  },
});
```

RabbitMQ에서 publisher가 메시지를 보낼때 설정할 수 있는 속성들이 존재한다.
대부분은 선택 사항이지만 주로 사용하는 것들은 아래와 같다.

## persistent (메시지 영속성)

메시지가 디스크에 기록되도록 설정하여, 서버 재시작 시에도 메시지가 유지되도록 한다.

## correlationId

메시지 고유 번호
RPC 통신에서 어떤 요청에 대한 응답인지 확인하기 위해, Request 메시지와 Response 메시지와 매핑하기 위해 사용된다.

## replyTo

응답 받을 큐 이름
RPC 구조에서 응답 받을 큐를 지정할때 사용한다

## contentType

메시지 형식 - application/json 같은 것들
