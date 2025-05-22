// express 불러오기
const express = require('express');
// express 인스턴스 생성
const app = express();
// 포트 정보
const port = 3000;

// 라우트 설정
// HTTP GET 방식으로 '/' 경로를 요청하였을 때
// Hello World!라는 문자열을 결과값으로 보냄
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// 서버 실행
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});