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

  if (isRenderPhase) {
    const update = { action, next: null };
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
  if (queue.last == null) return null;

  let first = queue.last.next;
  let node = first;
  let earliest = node;
  do {
    if (node.expirationTime < earliest.expirationTime) {
      earliest = node;
    }
    node = node.next;
  } while (node !== first);

  return earliest;
}

// 콜백 예약
function scheduleCallback(priority, callback, delay = 0) {
  const timeoutId = setTimeout(callback, delay);
  return { priority, timeoutId };
}

// 콜백 취소
function cancelCallback(callback) {
  clearTimeout(callback.timeoutId);
}

// 스케줄 예약 (고도화)
function ensureRootIsScheduled() {
  const nextUpdate = getNextPendingUpdate();
  if (!nextUpdate) return;

  const priority = inferPriority(nextUpdate.expirationTime);
  const timeout = expirationToDelay(nextUpdate.expirationTime);

  if (
    currentCallback &&
    currentCallbackPriority !== null &&
    priority >= currentCallbackPriority
  ) {
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
  renderScheduled = true;
  let workCompleted = false;

  while (updateQueue.length) {
    const update = updateQueue.shift();
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
  return currentTime + 50;
}

// 테스트 코드
const fiber = {};
const queue = { last: null };

dispatchAction(fiber, queue, (prev) => ({ count: prev.count + 1 }));
dispatchAction(fiber, queue, (prev) => ({ count: prev.count + 1 }));
dispatchAction(fiber, queue, (prev) => ({ count: prev.count + 1 }));

// 동기 콜백
scheduleSyncCallback(() => console.log("동기 콜백"));

// 동기 콜백 예약
function scheduleSyncCallback(callback) {
  callback();
}
