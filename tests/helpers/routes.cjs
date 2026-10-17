// Independent graph traversal for checking reachability and driving legal moves.
function isGate(maze, a, b) {
  return (a === maze.gate[0] && b === maze.gate[1]) || (a === maze.gate[1] && b === maze.gate[0]);
}

function explore(maze, from = maze.start, gateOpen = true) {
  const parent = new Map([[from, null]]), distance = new Map([[from, 0]]), queue = [from];
  for (const a of queue) for (const b of maze.cells[a].links) {
    if ((!gateOpen && isGate(maze, a, b)) || parent.has(b)) continue;
    parent.set(b, a); distance.set(b, distance.get(a) + 1); queue.push(b);
  }
  return { parent, distance };
}

function route(maze, from, to, gateOpen = true) {
  const { parent } = explore(maze, from, gateOpen);
  if (!parent.has(to)) throw new Error(`No legal route from ${from} to ${to}, gateOpen=${gateOpen}`);
  const result = [];
  for (let at = to; at !== from; at = parent.get(at)) result.unshift(at);
  return result;
}

function direction(maze, from, to) {
  const dx = to % maze.n - from % maze.n, dy = Math.floor(to / maze.n) - Math.floor(from / maze.n);
  if (dx === 0 && dy === -1) return 0;
  if (dx === 1 && dy === 0) return 1;
  if (dx === 0 && dy === 1) return 2;
  if (dx === -1 && dy === 0) return 3;
  throw new Error(`Nonadjacent move from ${from} to ${to}`);
}

module.exports = { explore, route, direction };
