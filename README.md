# file-server

프로젝트에 대한 간단한 설명입니다. 이 프로젝트는 다양한 패키지를 사용하여 파일 서버를 구축하는 데 중점을 두고 있습니다.

## 의존성 설치

```bash
bun install
```

## 실행 방법

```bash
bun run index.ts
```

이 프로젝트는 `bun init`을 사용하여 bun v1.1.37에서 생성되었습니다. [Bun](https://bun.sh)은 빠른 올인원 JavaScript 런타임입니다.

### 패키지

- [x] webtorrent
- [x] prisma
- [x] express (helmet, cors)
- [x] bcrypt
- [x] zod
- [x] puppeteer (크롤링 용도)
- [x] discord.js (discord 채널로 업데이트 알림 전송)
- [x] https, http
- [x] fluent-ffmpeg (코덱 검사 및 영상 인코딩)

- [] express-rate-limit (요청 속도 제한, Dos 공격 방지 미들웨어 - 기본 기능 후 적용 예정)
- [] jsonwebtoken (JWT -> JSON Web Token 사용자 인증 및 권한 부여 - 기본 기능 후 적용 예정)
