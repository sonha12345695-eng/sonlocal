# 모임 일정 체크

링크로 공유할 수 있는 모임 일정 체크 웹사이트입니다. 모임을 만들면 고유 링크가 생성되고, 링크를 받은 사람은 이름을 입력한 뒤 가능한 날짜와 시간을 체크할 수 있습니다. 응답은 Firebase Firestore에 실시간 저장되며 가장 많이 가능한 시간이 자동으로 표시됩니다.

## 주요 기능

- 새 모임 생성
- 모임별 고유 공유 링크 생성
- 참여자 이름 입력 및 가능한 날짜/시간 체크
- Firestore 실시간 저장 및 결과 반영
- 가장 많이 가능한 날짜/시간 자동 집계
- 모바일 대응 카드형 UI
- Vercel 배포 가능 구조

## 파일 구조

```text
.
├── src
│   ├── App.jsx
│   ├── App.css
│   ├── firebase.js
│   └── main.jsx
├── .env.example
├── index.html
├── package.json
├── vercel.json
├── vite.config.js
└── README.md
```

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 개발 서버 주소를 열면 됩니다. 보통 `http://localhost:5173`에서 실행됩니다.

배포용 빌드는 아래 명령으로 확인합니다.

```bash
npm run build
```

## Firebase 설정 방법

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트를 만듭니다.
2. 프로젝트 안에서 웹 앱을 추가합니다.
3. 웹 앱 설정 화면의 Firebase config 값을 확인합니다.
4. Firestore Database를 만들고 테스트 모드로 시작합니다.
5. 프로젝트 루트에 `.env` 파일을 만들고 `.env.example`을 참고해 값을 채웁니다.

```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

Vite에서 브라우저에 전달되는 환경변수는 반드시 `VITE_`로 시작해야 합니다. 이 프로젝트는 위 이름을 기준으로 정리되어 있습니다.

환경변수가 비어 있으면 앱 첫 화면에 빠진 변수 목록이 자동으로 표시됩니다. 이 목록을 보고 Firebase Console 또는 Vercel 환경변수에 같은 이름으로 값을 넣으면 됩니다.

## Firebase Console에서 config 값 찾기

1. Firebase Console에서 프로젝트를 엽니다.
2. 왼쪽 위 톱니바퀴 아이콘을 누르고 `프로젝트 설정`으로 이동합니다.
3. `일반` 탭에서 `내 앱` 영역을 찾습니다.
4. 웹 앱이 없다면 `</>` 아이콘으로 웹 앱을 추가합니다.
5. `Firebase SDK snippet`에서 `Config`를 선택합니다.
6. `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` 값을 복사합니다.
7. `.env` 파일 또는 Vercel 환경변수에 `VITE_`가 붙은 이름으로 입력합니다.

## Firestore 데이터 구조

```text
meetings/{meetingId}
  title: string
  slots: [{ id, date, time }]
  createdAt: timestamp

meetings/{meetingId}/participants/{participantId}
  name: string
  availableSlots: string[]
  updatedAt: timestamp
```

## Firestore Rules 예시

Firebase Console의 `Firestore Database` > `Rules` 탭에 아래 규칙을 붙여넣고 `Publish`를 누르세요. 같은 내용은 `firestore.rules` 파일에도 들어 있습니다.

이 규칙은 공유 링크 앱에 맞게 모임 읽기, 모임 생성, 참여자 응답 저장을 허용합니다. 모임 자체 수정과 삭제는 막아두었습니다.

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isMeetingCreate() {
      return request.resource.data.keys().hasOnly(['title', 'slots', 'createdAt'])
        && request.resource.data.title is string
        && request.resource.data.title.size() > 0
        && request.resource.data.title.size() <= 80
        && request.resource.data.slots is list
        && request.resource.data.slots.size() > 0
        && request.resource.data.slots.size() <= 200
        && request.resource.data.createdAt == request.time;
    }

    function isParticipantWrite() {
      return request.resource.data.keys().hasOnly(['name', 'availableSlots', 'updatedAt'])
        && request.resource.data.name is string
        && request.resource.data.name.size() > 0
        && request.resource.data.name.size() <= 40
        && request.resource.data.availableSlots is list
        && request.resource.data.availableSlots.size() <= 200
        && request.resource.data.updatedAt == request.time;
    }

    match /meetings/{meetingId} {
      allow read: if true;
      allow create: if isMeetingCreate();
      allow update, delete: if false;

      match /participants/{participantId} {
        allow read: if true;
        allow create, update: if isParticipantWrite();
        allow delete: if false;
      }
    }
  }
}
```

공식 Firebase 문서에서도 Firestore 웹/모바일 앱은 Security Rules가 요청마다 읽기와 쓰기 권한을 판단한다고 설명합니다. 규칙을 수정한 뒤 실제 반영까지 약간의 시간이 걸릴 수 있습니다.

## 외부 공유 전 Firebase 마무리 체크

1. Firestore Database가 생성되어 있어야 합니다.
2. Firestore `Rules` 탭에 위 규칙을 붙여넣고 `Publish`를 누릅니다.
3. Firebase Console의 `프로젝트 설정` > `일반` > `내 앱`에서 웹 앱 config 값을 확인합니다.
4. 로컬 `.env`와 Vercel 환경변수에 같은 값을 넣습니다.
5. Vercel에 배포한 뒤 새 모임을 하나 만들고 `/m/문서ID` 링크가 열리는지 확인합니다.
6. 휴대폰 또는 시크릿 창에서 링크를 열어 이름과 가능 시간을 저장해봅니다.
7. Firebase Console의 Firestore `Data` 탭에서 `meetings`와 `participants` 문서가 생겼는지 확인합니다.

공유 링크만 있으면 누구나 응답할 수 있는 구조입니다. 지인/팀 안에서 쓰는 가벼운 일정 조율용으로는 충분하지만, 공개 커뮤니티처럼 완전히 열린 곳에 배포할 계획이면 Firebase Authentication 또는 App Check를 추가하는 것이 좋습니다.

## Vercel 배포 방법

1. 이 프로젝트를 GitHub 저장소에 올립니다.
2. [Vercel](https://vercel.com/)에서 `Add New Project`를 선택합니다.
3. GitHub 저장소를 가져옵니다.
4. Framework Preset은 `Vite`로 선택합니다.
5. Build Command는 `npm run build`를 사용합니다.
6. Output Directory는 `dist`를 사용합니다.
7. 환경변수를 추가한 뒤 배포합니다.

`vercel.json`에는 모든 경로를 `index.html`로 돌려주는 rewrite 설정이 들어 있습니다. 그래서 `/m/abc123` 같은 공유 링크를 새로고침하거나 직접 열어도 React 앱이 정상적으로 표시됩니다.

더 자세한 배포 순서는 `VERCEL_DEPLOY.md`와 `온라인 배포 체크리스트.txt`를 참고하세요.

## Firebase 환경변수를 Vercel에 넣는 방법

Vercel 프로젝트 화면에서 아래 순서로 입력합니다.

1. `Settings`로 이동합니다.
2. `Environment Variables` 메뉴를 엽니다.
3. `.env.example`에 있는 변수 이름을 그대로 추가합니다.
4. Firebase Console의 웹 앱 config 값으로 각 값을 채웁니다.
5. Production, Preview, Development 중 필요한 환경에 체크합니다.
6. 저장 후 다시 배포합니다.

Vercel에 넣어야 하는 변수 이름은 아래와 같습니다.

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

## 배포 후 공유 링크 예시

배포 주소가 아래와 같다고 가정합니다.

```text
https://meeting-time-checker.vercel.app
```

사용자가 새 모임을 만들면 Firestore 문서 ID를 사용해 고유 링크가 생성됩니다.

```text
https://meeting-time-checker.vercel.app/m/abc123MeetingId
```

이 링크를 받은 참여자는 같은 화면에서 이름을 입력하고 가능한 시간을 체크합니다. 체크 결과는 Firestore에 저장되고, 다른 참여자가 같은 링크를 열어도 최신 결과와 가장 많이 가능한 시간이 자동으로 보입니다.

## 휴대폰 사용

Vercel 배포가 완료되면 휴대폰에서는 별도 앱 설치 없이 배포 주소를 열면 됩니다.

1. PC에서 새 모임을 만듭니다.
2. 생성된 `/m/모임ID` 링크를 복사합니다.
3. 카카오톡, 문자, 이메일 등으로 휴대폰에 보냅니다.
4. 휴대폰 브라우저에서 링크를 열고 이름과 가능한 시간을 체크합니다.

모바일 화면에서도 카드와 달력이 한 줄로 자연스럽게 내려오도록 반응형 CSS가 적용되어 있습니다.
