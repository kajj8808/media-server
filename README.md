# Media-sever ( video server )

## functions

- [x] video stream
- [x] auto video upload ( 반자동 )

## webtorrent-hybrid 사용중 문제가 됐던부분

- type이 없다.. ( webtorrent와 같은 type을 사용하고 있었기 떄문에 가져와 사용함. [ type-> webtorrent-hybrid.d.ts 참고 ] )
- peer의 수가 많아지면 프로그램이 죽어버리는 문제 ( websocket을 기반으로 하고 있는듯 함. -> max peer 설정 [20] )

## puppeteer 사용중 문제가 됐던 부분

- 서버 컴퓨터에 배포를 하였을때 시스템 언어가 맞지 않아 한글이 안나오는 경우가 있었음.
- 서버 컴퓨터에서 웹 브라우저를 실행하는데 오래걸려 오류를 발생시키고 일을 안하는 경우가 있음. ( 웹 페이지 로드를 기다리는 코드 추가. )

## 이후 수정

- [] 폴더가 존재하지 않으면 만드는 코드
- [] Test Case 추가
- [x] 코드 리펙토링

## TMDB의 한국어 개요가 업데이트 늦은 관계로 수정

- 1. 업데이트된 새로운 파일을 받는다.
- 2. TMDB에 한국어 개요가 없을 경우 임시로 개요, 제목 등을 DB에 등록해 둔다.
- 3. 이후 일정시간(1d) 마다 TMDB에 한국어 개요가 있는지 확인한다. 이떄 한국어 개요인지 아닌지는 episode의 kr_description 값을 보고!
