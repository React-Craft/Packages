const taskQueue = [];

function scheduleCallback(priority, callback, delay = 0, timeout = 5000) {
  const startTime = Date.now() + delay;
  const expirationTime = startTime + timeout;

  const task = {
    priority,
    callback,
    startTime,
    expirationTime,
  };
  taskQueue.push(task);

  taskQueue.sort((a, b) => {
    if (a.priority === b.priority) {
      return a.startTime - b.startTime;
    }
    return b.priority - a.priority;
  });

  console.log("작업 스케줄 후 큐 상태:", [...taskQueue]);
  return task;
}

function performWorkUntilDeadline() {
  console.log("performWorkUntilDeadline 호출");

  while (taskQueue.length > 0) {
    const currentTime = Date.now();
    const task = taskQueue[0];

    if (task.startTime <= currentTime && task.expirationTime >= currentTime) {
      console.log("작업 실행: Priority=", task.priority);

      // 작업을 5ms씩 나눠서 실행
      const workDuration = 5;
      let start = Date.now();
      while (Date.now() - start < workDuration) {
        // 실제 작업 실행
        task.callback();
      }

      // 작업이 완료되었으면 큐에서 제거
      taskQueue.shift();
      console.log("작업 실행 후 큐 :", [...taskQueue]);

      // 5ms 대기 후, 브라우저로 양보
      setTimeout(performWorkUntilDeadline, 5);
      break;
    } else if (task.expirationTime < currentTime) {
      console.log("작업 만료", task.priority);
      taskQueue.shift();
    } else {
      console.log("작업 대기:", task.priority);
      break;
    }
  }
}

function startScheduler() {
  function tick() {
    performWorkUntilDeadline();
    if (taskQueue.length > 0) {
      setTimeout(tick, 10); // 계속 반복
    }
  }
  tick();
}

function busyWork(duration) {
  const start = Date.now();
  while (Date.now() - start < duration) {}
  console.log("✅✅✅브라우저 작업중!");
}

// 작업 등록
scheduleCallback(
  1,
  () => {
    busyWork(10);
    console.log("작업 1 실행");
  },
  200,
  5000
);

scheduleCallback(
  2,
  () => {
    busyWork(10);
    console.log("작업 2 실행");
  },
  300,
  4000
);

// 시작점
startScheduler();
