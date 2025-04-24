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

// 동기 콜백 큐와 상태 변수들
let syncQueue = null;
let immediateQueueCallbackNode = null;

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

  if (priority === ImmediatePriority || timeout === 0) {
    console.log("동기 콜백으로 처리");
    currentCallback = scheduleSyncCallback(() => {
      currentCallback = null;
      currentCallbackPriority = null;
      performWork();
    });
  } else {
    console.log("비동기 콜백으로 처리");
    currentCallback = scheduleCallback(
      priority,
      () => {
        currentCallback = null;
        currentCallbackPriority = null;
        performWork();
      },
      timeout
    );
  }
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

// 동기 콜백 예약
function scheduleSyncCallback(callback) {
  console.log("동기 콜백 실행");

  // 동기 콜백을 큐에 푸시
  if (syncQueue === null) {
    syncQueue = [callback];
    // 큐를 다음 틱에서 플러시하도록 예약
    immediateQueueCallbackNode = scheduleCallback(
      ImmediatePriority,
      flushSyncCallbackQueueImpl
    );
  } else {
    // 이미 큐가 존재하면 콜백만 푸시
    syncQueue.push(callback);
  }

  // 더미 콜백 반환
  return { id: "fakeCallbackNode" }; // 일단 약야깃ㄱ으로 구현
}

// 큐를 플러시하는 함수 (여기서 콜백을 실행)
function flushSyncCallbackQueueImpl() {
  console.log("동기 콜백 큐 플러시");

  if (syncQueue !== null) {
    while (syncQueue.length > 0) {
      const callback = syncQueue.shift();
      console.log("콜백 실행:", callback);
      callback();
    }
    // 큐를 비움
    syncQueue = null;
  }

  // 큐가 비워졌으면, 예약된 작업이 없다면 immediateQueueCallbackNode를 취소
  if (immediateQueueCallbackNode) {
    cancelCallback(immediateQueueCallbackNode);
    immediateQueueCallbackNode = null;
  }
}

// 예약된 콜백을 취소하는 함수
function cancelCallback(callbackNode) {
  console.log("콜백 취소:", callbackNode);
}

// Scheduler_ImmediatePriority는 1로 간주

// scheduleCallback 구현
function scheduleCallback(priority, callback, timeout) {
  console.log("스케줄 콜백:", { priority });
  return setTimeout(callback, timeout); // 즉시 실행 (최단 시간 후)
}

// 테스트 코드
const fiber = {};
const queue = { last: null };

// 비동기
dispatchAction(fiber, queue, (prev) => ({ count: prev.count + 1 }));

//동기
setTimeout(() => {
  dispatchAction(fiber, queue, (prev) => ({ count: prev.count + 1 }));
}, 0);
