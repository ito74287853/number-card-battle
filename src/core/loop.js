export function startLoop({ update, render }) {
  let lastTime = performance.now();

  function frame(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    update(dt);
    render();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
