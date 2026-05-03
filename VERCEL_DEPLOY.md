# Vercel 배포 안내

이 프로젝트는 Vercel에 올리면 휴대폰에서도 사용할 수 있는 온라인 모임 일정 공유 웹앱이 됩니다.

## 1. GitHub에 프로젝트 올리기

Vercel은 보통 GitHub 저장소를 연결해서 배포합니다.

1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더의 파일을 저장소에 업로드합니다.
3. `.env` 파일은 업로드하지 않습니다.
4. `.env.example`, `vercel.json`, `firestore.rules`는 업로드해도 됩니다.

## 2. Vercel 프로젝트 만들기

1. [Vercel](https://vercel.com/)에 로그인합니다.
2. `Add New...` 또는 `New Project`를 누릅니다.
3. GitHub 저장소를 선택합니다.
4. Framework Preset은 `Vite`를 선택합니다.
5. Build Command는 `npm run build`입니다.
6. Output Directory는 `dist`입니다.
7. 아직 Deploy를 누르기 전에 환경변수를 입력합니다.

## 3. Vercel 환경변수 입력

Vercel 프로젝트 설정에서 아래 메뉴로 갑니다.

```text
Settings > Environment Variables
```

아래 6개를 Firebase Console의 웹 앱 config 값으로 추가합니다.

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

환경은 `Production`, `Preview`, `Development` 모두 체크해도 됩니다. 처음에는 모두 체크하는 편이 쉽습니다.

저장 후 `Deploy` 또는 `Redeploy`를 누릅니다.

## 4. Firebase Rules 배포

Firebase Console에서 아래로 이동합니다.

```text
Firestore Database > Rules
```

이 프로젝트의 `firestore.rules` 파일 내용을 복사해서 붙여넣고 `Publish`를 누릅니다.

## 5. 배포 후 휴대폰 테스트

배포 주소가 아래처럼 나왔다고 가정합니다.

```text
https://meeting-time-checker.vercel.app
```

1. 배포 주소를 엽니다.
2. 새 모임을 만듭니다.
3. 생성된 공유 링크를 복사합니다.

예시:

```text
https://meeting-time-checker.vercel.app/m/abc123MeetingId
```

4. 이 링크를 카카오톡, 문자, 이메일로 휴대폰에 보냅니다.
5. 휴대폰에서 링크를 열고 이름을 입력한 뒤 가능한 시간을 체크합니다.
6. 다른 브라우저나 다른 휴대폰에서 같은 링크를 열어 결과가 실시간으로 보이는지 확인합니다.

## 6. 잘 안 될 때 확인할 것

- Vercel 환경변수 이름이 `VITE_`로 시작하는지 확인합니다.
- 환경변수 저장 후 다시 배포했는지 확인합니다.
- Firebase Firestore Rules를 `Publish` 했는지 확인합니다.
- Vercel 배포 주소가 `https://`로 시작하는지 확인합니다.
- 공유 링크가 `/m/모임ID` 형태인지 확인합니다.

`vercel.json` 파일이 있기 때문에 `/m/모임ID` 링크를 바로 열거나 새로고침해도 React 앱이 정상적으로 열립니다.
