import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db, isFirebaseConfigured, missingFirebaseEnv } from './firebase';

const DEFAULT_TIMES = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

function getMeetingIdFromPath() {
  const match = window.location.pathname.match(/^\/m\/([^/]+)/);
  return match?.[1] ?? null;
}

function formatSlot(slot) {
  const date = new Date(`${slot.date}T${slot.time}:00`);
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function toDateId(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarDays(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);

    return {
      id: toDateId(day),
      day: day.getDate(),
      isCurrentMonth: day.getMonth() === monthDate.getMonth(),
      isToday: toDateId(day) === toDateId(new Date())
    };
  });
}

function formatMonthLabel(date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long'
  }).format(date);
}

function getParticipantKey(meetingId) {
  const storageKey = `meeting-participant-${meetingId}`;
  const existing = localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  localStorage.setItem(storageKey, next);
  return next;
}

function FirebaseSetupNotice() {
  return (
    <main className="page-shell centered">
      <section className="panel setup-panel">
        <p className="eyebrow">Firebase setup needed</p>
        <h1>Firestore 연결 값이 아직 비어 있어요.</h1>
        <p>
          Firebase Console에서 웹 앱을 추가한 뒤 config 값을 `.env` 또는 Vercel 환경변수에 넣으면
          모임 생성과 실시간 저장이 작동합니다.
        </p>

        <div className="missing-list">
          {missingFirebaseEnv.map((key) => (
            <code key={key}>{key}</code>
          ))}
        </div>

        <div className="setup-steps">
          <strong>처음 설정 순서</strong>
          <p>Firebase 프로젝트 만들기 → 웹 앱 추가 → Firestore Database 만들기 → 위 환경변수 입력</p>
        </div>
      </section>
    </main>
  );
}

function CreateMeeting() {
  const today = toDateId(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = toDateId(tomorrowDate);
  const [title, setTitle] = useState('');
  const [selectedDates, setSelectedDates] = useState([today, tomorrow]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedTimes, setSelectedTimes] = useState(['11:00', '14:00', '19:00']);
  const [createdLink, setCreatedLink] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);
  const dates = useMemo(() => selectedDates.slice().sort(), [selectedDates]);

  const slots = useMemo(
    () =>
      dates.flatMap((date) =>
        selectedTimes
          .slice()
          .sort()
          .map((time) => ({
            id: `${date}_${time}`,
            date,
            time
          }))
      ),
    [dates, selectedTimes]
  );

  async function handleCreate(event) {
    event.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('모임 이름을 입력해주세요.');
      return;
    }

    if (slots.length === 0) {
      setError('날짜와 시간을 하나 이상 선택해주세요.');
      return;
    }

    setIsCreating(true);

    try {
      const meetingRef = await addDoc(collection(db, 'meetings'), {
        title: title.trim(),
        slots,
        createdAt: serverTimestamp()
      });
      const link = `${window.location.origin}/m/${meetingRef.id}`;
      setCreatedLink(link);
      window.location.href = `/m/${meetingRef.id}`;
    } catch (createError) {
      setError('모임을 만드는 중 문제가 생겼어요. Firebase 설정을 확인해주세요.');
      console.error(createError);
    } finally {
      setIsCreating(false);
    }
  }

  function toggleTime(time) {
    setSelectedTimes((current) =>
      current.includes(time) ? current.filter((item) => item !== time) : [...current, time]
    );
  }

  function toggleDate(dateId) {
    setSelectedDates((current) =>
      current.includes(dateId) ? current.filter((date) => date !== dateId) : [...current, dateId]
    );
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Linkable schedule poll</p>
        <h1>함께 가능한 시간을 부드럽게 모아보세요.</h1>
        <p>
          모임을 만들고 링크를 공유하면 참여자들이 가능한 날짜와 시간을 체크할 수 있어요.
          결과는 Firestore에 실시간 저장되고 가장 많이 겹치는 시간이 바로 보입니다.
        </p>
      </section>

      <section className="layout">
        <form className="panel" onSubmit={handleCreate}>
          <div className="panel-heading">
            <span>1</span>
            <div>
              <h2>새 모임 만들기</h2>
              <p>후보 날짜와 시간을 정하면 공유 링크가 생성됩니다.</p>
            </div>
          </div>

          <label className="field">
            모임 이름
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 5월 팀 저녁 모임"
            />
          </label>

          <div className="field">
            후보 날짜
            <div className="calendar">
              <div className="calendar-toolbar">
                <button type="button" onClick={() => setCalendarMonth((current) => addMonths(current, -1))}>
                  이전
                </button>
                <strong>{formatMonthLabel(calendarMonth)}</strong>
                <button type="button" onClick={() => setCalendarMonth((current) => addMonths(current, 1))}>
                  다음
                </button>
              </div>

              <div className="weekday-grid">
                {['일', '월', '화', '수', '목', '금', '토'].map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>

              <div className="date-grid">
                {calendarDays.map((day) => (
                  <button
                    className={[
                      'date-button',
                      day.isCurrentMonth ? '' : 'muted-date',
                      day.isToday ? 'today' : '',
                      selectedDates.includes(day.id) ? 'selected' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={day.id}
                    onClick={() => toggleDate(day.id)}
                    type="button"
                  >
                    {day.day}
                  </button>
                ))}
              </div>
            </div>

            <div className="selected-date-list">
              {dates.length > 0 ? (
                dates.map((date) => <span key={date}>{date}</span>)
              ) : (
                <p className="muted">달력에서 후보 날짜를 선택해주세요.</p>
              )}
            </div>
          </div>

          <div className="field">
            후보 시간
            <div className="time-grid">
              {DEFAULT_TIMES.map((time) => (
                <button
                  className={selectedTimes.includes(time) ? 'chip active' : 'chip'}
                  key={time}
                  onClick={() => toggleTime(time)}
                  type="button"
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <button className="primary-button" disabled={isCreating} type="submit">
            {isCreating ? '만드는 중...' : '공유 링크 만들기'}
          </button>
        </form>

        <aside className="panel preview">
          <div className="panel-heading">
            <span>2</span>
            <div>
              <h2>미리보기</h2>
              <p>{slots.length}개의 후보 시간이 준비되어 있어요.</p>
            </div>
          </div>

          <div className="slot-list">
            {slots.slice(0, 8).map((slot) => (
              <div className="slot-row" key={slot.id}>
                <strong>{slot.date}</strong>
                <span>{slot.time}</span>
              </div>
            ))}
            {slots.length > 8 && <p className="muted">외 {slots.length - 8}개 더</p>}
          </div>

          {createdLink && (
            <div className="share-box">
              <p>생성된 링크</p>
              <a href={createdLink}>{createdLink}</a>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function MeetingRoom({ meetingId }) {
  const [meeting, setMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantKey, setParticipantKey] = useState('');
  const [name, setName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let unsubscribeParticipants = () => {};

    async function loadMeeting() {
      try {
        const meetingRef = doc(db, 'meetings', meetingId);
        const meetingSnap = await getDoc(meetingRef);

        if (!meetingSnap.exists()) {
          setError('존재하지 않는 모임 링크입니다.');
          return;
        }

        setMeeting({ id: meetingSnap.id, ...meetingSnap.data() });
        const key = getParticipantKey(meetingId);
        setParticipantKey(key);

        const participantRef = doc(db, 'meetings', meetingId, 'participants', key);
        const participantSnap = await getDoc(participantRef);

        if (participantSnap.exists()) {
          const participant = participantSnap.data();
          setName(participant.name ?? '');
          setSelectedSlots(participant.availableSlots ?? []);
        }

        const participantsQuery = query(
          collection(db, 'meetings', meetingId, 'participants'),
          orderBy('updatedAt', 'desc')
        );

        unsubscribeParticipants = onSnapshot(participantsQuery, (snapshot) => {
          setParticipants(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        });
      } catch (loadError) {
        setError('모임 정보를 불러오지 못했어요. Firebase 설정을 확인해주세요.');
        console.error(loadError);
      } finally {
        setIsLoading(false);
      }
    }

    loadMeeting();

    return () => unsubscribeParticipants();
  }, [meetingId]);

  async function saveAvailability(nextName, nextSlots) {
    if (!participantKey || !nextName.trim()) {
      return;
    }

    await setDoc(
      doc(db, 'meetings', meetingId, 'participants', participantKey),
      {
        name: nextName.trim(),
        availableSlots: nextSlots,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  async function handleNameBlur() {
    await saveAvailability(name, selectedSlots);
  }

  async function toggleSlot(slotId) {
    const nextSlots = selectedSlots.includes(slotId)
      ? selectedSlots.filter((item) => item !== slotId)
      : [...selectedSlots, slotId];

    setSelectedSlots(nextSlots);
    await saveAvailability(name, nextSlots);
  }

  const rankedSlots = useMemo(() => {
    if (!meeting?.slots) {
      return [];
    }

    return meeting.slots
      .map((slot) => ({
        ...slot,
        count: participants.filter((participant) => participant.availableSlots?.includes(slot.id)).length
      }))
      .sort((a, b) => b.count - a.count || a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [meeting, participants]);

  const bestCount = rankedSlots[0]?.count ?? 0;
  const shareLink = `${window.location.origin}/m/${meetingId}`;

  if (isLoading) {
    return (
      <main className="page-shell centered">
        <div className="panel">모임을 불러오는 중...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-shell centered">
        <div className="panel error-panel">{error}</div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="room-header">
        <button className="ghost-button" onClick={() => (window.location.href = '/')} type="button">
          새 모임
        </button>
        <div>
          <p className="eyebrow">Shared meeting link</p>
          <h1>{meeting.title}</h1>
          <a href={shareLink}>{shareLink}</a>
        </div>
      </section>

      <section className="layout room-layout">
        <section className="panel">
          <div className="panel-heading">
            <span>1</span>
            <div>
              <h2>가능한 시간 체크</h2>
              <p>이름을 입력한 뒤 가능한 시간을 누르면 바로 저장됩니다.</p>
            </div>
          </div>

          <label className="field">
            이름
            <input
              value={name}
              onBlur={handleNameBlur}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 민지"
            />
          </label>

          <div className="availability-grid">
            {meeting.slots.map((slot) => (
              <button
                className={selectedSlots.includes(slot.id) ? 'availability-card checked' : 'availability-card'}
                disabled={!name.trim()}
                key={slot.id}
                onClick={() => toggleSlot(slot.id)}
                type="button"
              >
                <span>{slot.date}</span>
                <strong>{slot.time}</strong>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel results">
          <div className="panel-heading">
            <span>2</span>
            <div>
              <h2>가장 많이 가능한 시간</h2>
              <p>{participants.length}명이 응답했습니다.</p>
            </div>
          </div>

          {bestCount > 0 ? (
            <div className="best-list">
              {rankedSlots
                .filter((slot) => slot.count === bestCount)
                .map((slot) => (
                  <div className="best-card" key={slot.id}>
                    <span>{bestCount}명 가능</span>
                    <strong>{formatSlot(slot)}</strong>
                  </div>
                ))}
            </div>
          ) : (
            <p className="muted">아직 체크된 시간이 없어요.</p>
          )}

          <div className="rank-list">
            {rankedSlots.map((slot) => (
              <div className="rank-row" key={slot.id}>
                <span>{slot.date} {slot.time}</span>
                <strong>{slot.count}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

export default function App() {
  if (!isFirebaseConfigured) {
    return <FirebaseSetupNotice />;
  }

  const meetingId = getMeetingIdFromPath();
  return meetingId ? <MeetingRoom meetingId={meetingId} /> : <CreateMeeting />;
}
