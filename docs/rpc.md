# RPC (Remote Procedure Call)

두번째 Publish/Subscribe 튜토리얼에서 Work Queue들을 통해 time-consuming tasks들을 여러 worker들에게 분배하여 일을 시키는 법을 배웠다.

하지만 만약 Consumer에서 특별한 로직을 거쳐 나온 결과값을 다시 return 받아야한다면 어떻게 해야할까?

이때 사용하는 것이 Remote Procedure Call (RPC)방식이다.

# 1. RPC를 도입하기 전 고려사항

RPC를 사용하는 것이 microservice 단에서 표준적인 방식이긴 하지만 비판되기도 한다. RPC는 간혹 unpredictable system 과 unnecessary complexity를 야기한다. 따라서 RPC를 잘못사용했다 가는 오히려 성능이 더 안좋아질 수 있고 유지보수 하기 어려운 unmaintainable spaghetti code가 될 수 도 있다.

```jsx
- Make sure it's obvious which function call is local and which is remote.
- Document your system. Make the dependencies between components clear.
- Handle error cases. How should the client react when the RPC server is down for a long time?
```

따라서 의심이 든다면 RPC 사용을 자제하자. 가능하다면 비동기적인 서비스 파이프라인을 직접 구축하는게 더 나은 선택이 될 수 도 있다.

# 2. Callback Queue

RPC는 간단하다. Producer가 메시지를 보내면 Consumer는 Response Message로 응답한다. 응답을 받기 위해서 우리는 Producer가 메시지 외 추가로 응답 메시지를 받을 Queue인 callback queue에 대한 정보도 같이 보내야한다.

```jsx
// 익명 큐 생성: 메시지를 Exchange로부터 받으려면 Queue가 필요하므로!
// exclusive 옵션을 통해 이 채널에서만 사용하고 연결이 끊기면 삭제되게 함
channel.assertQueue('', { exclusive: true });

// 메시지를 Queue로 보낼때 응답을 받을 Queue에 대한 정보를 replyTo로 보낸다
channel.sendToQueue('rpc_queue', Buffer.from('10'), { replyTo: queue_name });

# ... then code to read a response message from the callback queue ...
```

### Message Properties

1. persistent : message가 디스크에도 저장되어 영속성을 유지할 수 있게 한다
2. content_type :
3. reply_to : RPC에서 callback queue를 명시하기 위해 사용
4. correlation_id : RPC에서 request 메시지에 대한 response 메시지를 매칭하기 위해 사용

# 3. Correlation Id

매 RPC Request 메시지마다 하나의 callback queue를 만드는 것은 매우 비효율적이다. 그래서 보편적으로 하나의 Producer 당 하나의 callback queue를 만든다. 그리고 해당 Producer에서 전송되는 메시지를 모두 하나의 callback queue에 넣어 Consumer에게 전달한다.

이렇게 되면 새로운 이슈가 발생한다. 해당 Queue로 받은 Response가 어떤 Request에 대한 Response인지 확인할 수 없다는 것이다. 따라서 `correlation_id` 를 사용한다. 우리는 매 request 마다 새로운 `correlation_id`를 설정할 것이다. 추후에 callback queue로 response를 받으면 우리는 이 correlation_id 라는 property를 통해 어떤 request에 대한 response인지 알 수 있을 것이다. 만약 unknown correlation_id 값이라면, 우리가 보낸 request에 대한 response가 아님을 확신하고 안전하게 discard the message 할 수 있다.

# 4. RPC 동작 방식

1. Client 가 시작하면 Response를 받을 익명 큐(anonymous callback queue)를 생성한다.
2. Client는 두 Property를 가진 Request 메시지를 보낸다.
   - reply_to : request에 대한 response를 받을 callback queue이다
   - correlation_id : 매 request 마다 부여되는 고유한 id 값이다
3. Request는 Consumer와 binding된 Queue로 전달된다.
4. RPC worker(server)는 해당 Queue에 들어온 Request들을 대기한다. Request가 들어오면 할일을 하고 Client에게 결과에 대한 응답을 보낸다. 이때 Request와 같이 들어온 reply_to property를 사용하여 어떤 Queue로 Response를 보낼지 결정한다.
5. Client는 callback queue에 응답이 오기를 기다린다. 응답이 왔을시, correlation_id를 확인한다. 만약 Request에 대한 id와 매칭이되면 어플리케이션에게 응답을 전달한다.

# 5. Consume 함수가 먼저 실행되는 이유

이 함수는 한 개의 요청에 대한 처리를 진행하는 함수이다. 즉 1개의 요청을 보내고 1개의 응답을 받는 역할을 해주는 함수이다.

이때 consume을 먼저 하는 이유는 먼저 익명 replyQueue를 구독해서, 응답이 올 경우 잡을 준비를 하기 위해서이다. 이게 먼저 실행되는 이유는 메시지를 보낸 다음 consume 함수를 실행하기도 전에 곧바로 응답이 올 수도 있기 때문이다.

→ 즉, 들어오는 응답이 유실되지 않고, 놓치지 않기 위해 consume을 먼저 등록하는 것이다
