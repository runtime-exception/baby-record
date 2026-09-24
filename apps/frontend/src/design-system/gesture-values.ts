export function exceedsLongPressTolerance(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  tolerance: number,
) {
  return Math.hypot(currentX - startX, currentY - startY) > tolerance;
}

export function shouldStartPullRefresh(scrollTop: number, deltaY: number) {
  return scrollTop <= 0 && deltaY > 0;
}

export function hasReachedRefreshThreshold(distance: number, threshold: number) {
  return distance >= threshold;
}

export function consumeSuppressedClick(state: { value: boolean }) {
  if (state.value) {
    state.value = false;
    return true;
  }
  return false;
}
