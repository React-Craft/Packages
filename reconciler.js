// 우선순위
const ImmediatePriority = 1,
  NormalPriority = 2,
  LowPriority = 3;

// 상태 업데이트 큐
let updateQueue = [],
  renderScheduled = false;
let state = { count: 0 };

// 현재 예약 상태
let currentCallback = null;
let currentCallbackPriority = null;

// 상태 업데이트 디스패치
function dispatchAction(fiber, queue, action) {
  const isRenderPhase = isRendering();

  console.log("dispatchAction 호출");
  console.log("현재 상태:", state);

  if (isRenderPhase) {
    const update = { action, next: null };
    console.log("렌더링 중, 즉시 업데이트 실행");
    applyUpdateImmediately(update);
  } else {
    const currentTime = Date.now();
    const expirationTime = computeExpirationTime(fiber, currentTime);

    const update = {
      expirationTime,
      action,
      next: null,
      eagerReducer: null,
      eagerState: null,
    };

    console.log("렌더링 중이 아님, 큐에 업데이트 추가");
    const last = queue.last;
    if (last === null) {
      update.next = update;
    } else {
      const first = last.next;
      if (first !== null) {
        update.next = first;
      }
      last.next = update;
    }
    queue.last = update;

    updateQueue.push(update);
    ensureRootIsScheduled();
  }
}

// 렌더링 중인지 체크
function isRendering() {
  return renderScheduled;
}

// 즉시 업데이트
function applyUpdateImmediately(update) {
  console.log("즉시 업데이트 실행:", update);
  state = {
    ...state,
    ...update.action(state),
  };
  render();
}

// 우선순위 추론
function inferPriority(expirationTime) {
  const timeLeft = expirationTime - Date.now();
  if (timeLeft <= 0) return ImmediatePriority;
  if (timeLeft <= 100) return NormalPriority;
  return LowPriority;
}

// 딜레이 계산
function expirationToDelay(expirationTime) {
  const delay = expirationTime - Date.now();
  return Math.max(0, delay);
}

// 가장 시급한 업데이트 찾기
function getNextPendingUpdate() {
  if (updateQueue.length === 0) return null;

  console.log("가장 시급한 업데이트 찾기 시작");
  let first = updateQueue[0];
  let earliest = first;

  for (const update of updateQueue) {
    if (update.expirationTime < earliest.expirationTime) {
      earliest = update;
    }
  }

  console.log("가장 시급한 업데이트:", earliest);
  return earliest;
}

// 콜백 예약
function scheduleCallback(priority, callback, delay = 0) {
  console.log("콜백 예약:", { priority, delay });
  const timeoutId = setTimeout(callback, delay);
  return { priority, timeoutId };
}

// 콜백 취소
function cancelCallback(callback) {
  clearTimeout(callback.timeoutId);
  console.log("콜백 취소:", callback);
}

// 스케줄 예약 (고도화)
function ensureRootIsScheduled() {
  const nextUpdate = getNextPendingUpdate();
  if (!nextUpdate) return;

  const priority = inferPriority(nextUpdate.expirationTime);
  const timeout = expirationToDelay(nextUpdate.expirationTime);

  console.log("다음 업데이트의 우선순위와 딜레이 계산:", { priority, timeout });

  if (
    currentCallback &&
    currentCallbackPriority !== null &&
    priority >= currentCallbackPriority
  ) {
    console.log("현재 콜백이 더 우선순위가 높아서 스케줄하지 않음");
    return;
  }

  if (currentCallback) {
    cancelCallback(currentCallback);
  }

  currentCallbackPriority = priority;
  currentCallback = scheduleCallback(priority, () => {
    currentCallback = null;
    currentCallbackPriority = null;
    performWork();
  }, timeout);
}

// 실제 작업 처리
function performWork() {
  console.log("performWork 실행");
  renderScheduled = true;
  let workCompleted = false;

  while (updateQueue.length) {
    const update = updateQueue.shift();
    console.log("업데이트 처리:", update);
    if (typeof update.action === "function") {
      state = { ...state, ...update.action(state) };
      workCompleted = true;
    }
  }

  renderScheduled = false;

  if (workCompleted) {
    render();
  }
}

// 렌더링
function render() {
  console.log("🖼️ 렌더링! 상태:", state);
}

// 만료 시간 계산
function computeExpirationTime(fiber, currentTime) {
  return currentTime + 50; // 50ms 뒤에 만료
}

// 테스트 코드
const fiber = {};
const queue = { last: null };

// 상태 업데이트 디스패치
dispatchAction(fiber, queue, (prev) => ({ count: prev.count + 1 }));
dispatchAction(fiber, queue, (prev) => ({ count: prev.count + 1 }));

// 동기 콜백
scheduleSyncCallback(() => console.log("동기 콜백"));

// 동기 콜백 예약
function scheduleSyncCallback(callback) {
  console.log("동기 콜백 실행");
  callback();
}
