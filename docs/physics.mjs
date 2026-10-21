export function reflectPaddle(ball, paddle, speed) {
  const offset = Math.max(-1, Math.min(1, (ball.x - paddle.x - paddle.w / 2) / (paddle.w / 2)));
  const angle = offset * Math.PI / 3;
  ball.vx = Math.sin(angle) * speed;
  ball.vy = -Math.cos(angle) * speed;
}
export function hitBrick(ball, brick, previousX, previousY) {
  if (!brick.alive || ball.x + ball.r < brick.x || ball.x - ball.r > brick.x + brick.w || ball.y + ball.r < brick.y || ball.y - ball.r > brick.y + brick.h) return false;
  if (previousY + ball.r <= brick.y || previousY - ball.r >= brick.y + brick.h) ball.vy *= -1;
  else if (previousX + ball.r <= brick.x || previousX - ball.r >= brick.x + brick.w) ball.vx *= -1;
  else ball.vy *= -1;
  return true;
}
