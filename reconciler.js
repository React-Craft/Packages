// 우선순위
const ImmediatePriority = 1,
  NormalPriority = 2,
  LowPriority = 3;

// 상태 업데이트 큐
let updateQueue = [],
  renderScheduled = false;
let state = { count: 0 };

// 상태 업데이트 디스패치
function dispatchAction(fiber, queue, action) {
  const isRenderPhase = isRendering(); // 렌더링 중인지 체크

  if (isRenderPhase) {
    // 렌더링 중 업데이트
    const update = {
      action,
      next: null,
    };
    // 즉시 업데이트 적용 (렌더링 중이므로 즉시 상태를 업데이트)
    applyUpdateImmediately(update);
  } else {
    // 렌더링 외부 업데이트
    // 시간 계산
    const currentTime = Date.now();
    const expirationTime = computeExpirationTime(fiber, currentTime);

    // update 생성
    const update = {
      expirationTime,
      action,
      next: null,
      eagerReducer: null, // 최적화 관련 속성
      eagerState: null, // 최적화 관련 속성
    };

    // 큐에 추가
    const last = queue.last;
    if (last === null) {
      // 첫 번째 업데이트, 원형 리스트 생성
      update.next = update;
    } else {
      const first = last.next;
      if (first !== null) {
        // 원형 리스트 유지
        update.next = first;
      }
      last.next = update;
    }
    queue.last = update;

    // 스케줄 예약
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

// ensureRootIsScheduled
function ensureRootIsScheduled() {
  if (!renderScheduled) {
    renderScheduled = true;
    scheduleCallback(NormalPriority, performWork);
  }
}

// 콜백 예약 (우선순위 딜레이 시뮬레이션)
function scheduleCallback(priority, callback) {
  setTimeout(
    callback,
    priority === LowPriority ? 100 : priority === NormalPriority ? 50 : 0
  );
}

// 실제 작업 처리
function performWork() {
  renderScheduled = false;
  let workCompleted = false;

  while (updateQueue.length) {
    const update = updateQueue.shift();
    if (typeof update.action === "function") {
      state = { ...state, ...update.action(state) };
      workCompleted = true;
    }
  }

  if (workCompleted) {
    render();
  }
}

//render
function render() {
  console.log("🖼️ 렌더링! 상태:", state);
}

// 계산산
function computeExpirationTime(fiber, currentTime) {
  return currentTime + 50;
}

const fiber = {}; // fiber
const queue = { last: null };
dispatchAction(fiber, queue, (prev) => ({ count: prev.count + 1 }));
dispatchAction(fiber, queue, (prev) => ({ count: prev.count + 1 }));
dispatchAction(fiber, queue, (prev) => ({ count: prev.count + 1 }));

// 동기 콜백 예약
scheduleSyncCallback(() => console.log("동기 콜백"));

// 동기 콜백 예약
function scheduleSyncCallback(callback) {
  callback();
}
